import { MINUTE_MS } from './constants';
import { zonedParts, zonedToUtc } from './zoned';

const pad2 = (value: number) => String(value).padStart(2, '0');

export interface DayParts {
  year: number;
  month: number;
  day: number;
}

export function parseDayKey(key: string): DayParts {
  const [year, month, day] = key.split('-').map(Number);
  return { year: year!, month: month!, day: day! };
}

const partsOf = (parts: DayParts) => `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;

export function minutesOfDay(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  return p.hour * 60 + p.minute;
}

export function toLocalInputValue(iso: string, timeZone: string): string {
  const p = zonedParts(new Date(iso), timeZone);
  return `${partsOf(p)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function fromLocalInputValue(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  return zonedToUtc({ year: year!, month: month!, day: day!, hour: hour!, minute: minute! }, timeZone).toISOString();
}

export function localInstant(dayKey: string, minutes: number, timeZone: string): Date {
  return zonedToUtc({ ...parseDayKey(dayKey), hour: 0, minute: minutes }, timeZone);
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
  const { year, month, day } = parseDayKey(dayKey);
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
  const { year, month, day } = parseDayKey(dayKey);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function dayKeyFor(iso: string, timeZone: string, dayStartMinutes: number): string {
  const local = zonedParts(new Date(iso), timeZone);
  const key = partsOf(local);
  return local.hour * 60 + local.minute < dayStartMinutes ? shiftDay(key, -1) : key;
}

export function calendarDayMs(iso: string, timeZone: string): number {
  return Date.parse(`${dayKeyFor(iso, timeZone, 0)}T00:00:00Z`);
}

export function lastDays(endKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftDay(endKey, index - count + 1));
}

export function dayWindow(dayKey: string, timeZone: string, dayStartMinutes: number): { start: Date; end: Date } {
  return {
    start: localInstant(dayKey, dayStartMinutes, timeZone),
    end: localInstant(shiftDay(dayKey, 1), dayStartMinutes, timeZone),
  };
}

export function shiftLocalDays(iso: string, days: number, timeZone: string): string {
  const at = Date.parse(iso);
  const local = zonedParts(at, timeZone);
  const shifted = localInstant(shiftDay(partsOf(local), days), local.hour * 60 + local.minute, timeZone);
  return new Date(shifted.getTime() + (at % MINUTE_MS)).toISOString();
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
