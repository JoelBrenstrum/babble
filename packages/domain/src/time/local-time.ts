import { zonedToUtc } from './zoned';

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsIn(instant: Date, timeZone: string) {
  const key = `parts:${timeZone}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    formatters.set(key, formatter);
  }
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) parts[part.type] = part.value;
  return parts as { year: string; month: string; day: string; hour: string; minute: string };
}

export function isWithinNight(instant: Date, timeZone: string, startMinutes: number, endMinutes: number): boolean {
  const p = partsIn(instant, timeZone);
  const minutes = Number(p.hour) * 60 + Number(p.minute);
  if (startMinutes === endMinutes) return false;
  return startMinutes < endMinutes
    ? minutes >= startMinutes && minutes < endMinutes
    : minutes >= startMinutes || minutes < endMinutes;
}

export function toLocalInputValue(iso: string, timeZone: string): string {
  const p = partsIn(new Date(iso), timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function fromLocalInputValue(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [number, number, number, number, number];
  return zonedToUtc({ year, month, day, hour, minute }, timeZone).toISOString();
}

export function formatTimeOfDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-NZ', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(iso))
    .replace(/\s/g, ' ')
    .toLowerCase();
}

export function formatDayLabel(dayKey: string, todayKey: string): string {
  if (dayKey === todayKey) return 'Today';
  if (dayKey === shiftDay(todayKey, -1)) return 'Yesterday';
  return formatDayDate(dayKey);
}

export function formatDayDate(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number) as [number, number, number];
  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(new Date(Date.UTC(year, month - 1, day)))) {
    parts[part.type] = part.value;
  }
  return `${parts.weekday} ${parts.day} ${parts.month}`;
}

export function shiftDay(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function dayKeyFor(iso: string, timeZone: string, dayStartMinutes: number): string {
  const shifted = new Date(Date.parse(iso) - dayStartMinutes * 60_000);
  const p = partsIn(shifted, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function dayWindow(dayKey: string, timeZone: string, dayStartMinutes: number): { start: Date; end: Date } {
  const midnight = fromLocalInputValue(`${dayKey}T00:00`, timeZone)!;
  const nextMidnight = fromLocalInputValue(`${shiftDay(dayKey, 1)}T00:00`, timeZone)!;
  const offset = dayStartMinutes * 60_000;
  return { start: new Date(Date.parse(midnight) + offset), end: new Date(Date.parse(nextMidnight) + offset) };
}

export function formatShortDate(iso: string, timeZone: string): string {
  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-NZ', { timeZone, day: 'numeric', month: 'short' }).formatToParts(
    new Date(iso),
  )) {
    parts[part.type] = part.value;
  }
  return `${parts.day} ${parts.month}`;
}
