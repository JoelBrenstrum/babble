import { DAY_MS } from './constants';

export interface LocalDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface ZonedParts extends LocalDateTime {
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function zonedParts(instant: number | Date, timeZone: string): ZonedParts {
  const parts: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
    hour: parts.hour!,
    minute: parts.minute!,
    second: parts.second!,
  };
}

export function timeZoneOffsetMs(instant: number, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

// Ambiguous fall-back times pick the earlier instant; spring-forward gap times shift forward.
export function zonedToUtc(local: LocalDateTime, timeZone: string): Date {
  const wallClock = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const offsetBefore = timeZoneOffsetMs(wallClock - DAY_MS, timeZone);
  const offsetAfter = timeZoneOffsetMs(wallClock + DAY_MS, timeZone);

  const candidates = [wallClock - Math.max(offsetBefore, offsetAfter), wallClock - Math.min(offsetBefore, offsetAfter)];
  for (const candidate of candidates) {
    if (candidate + timeZoneOffsetMs(candidate, timeZone) === wallClock) return new Date(candidate);
  }
  return new Date(wallClock - offsetBefore);
}
