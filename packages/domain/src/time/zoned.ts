export interface LocalDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
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

export function timeZoneOffsetMs(instant: number, timeZone: string): number {
  const parts: Record<string, number> = {};
  for (const part of formatterFor(timeZone).formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!, parts.second!);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

// Ambiguous fall-back times pick the earlier instant; spring-forward gap times shift forward.
export function zonedToUtc(local: LocalDateTime, timeZone: string): Date {
  const wallClock = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  const offsetBefore = timeZoneOffsetMs(wallClock - 24 * 3600_000, timeZone);
  const offsetAfter = timeZoneOffsetMs(wallClock + 24 * 3600_000, timeZone);

  const candidates = [wallClock - Math.max(offsetBefore, offsetAfter), wallClock - Math.min(offsetBefore, offsetAfter)];
  for (const candidate of candidates) {
    if (candidate + timeZoneOffsetMs(candidate, timeZone) === wallClock) return new Date(candidate);
  }
  return new Date(wallClock - offsetBefore);
}
