import { groupByDay } from '../events/group';
import { segmentTotals } from '../events/segments';
import { summariseSleep } from '../events/sleep-stretches';
import type { BabyEvent, Units } from '../events/types';
import { formatDuration } from '../format/duration';
import { formatVolume, formatWeightChange } from '../format/units';
import { dayKeyFor, formatDayDate, formatDayLabel, formatShortDate, shiftDay } from '../time/local-time';
import type { StripKind } from './list-strip';

export interface DayHeading {
  title: string;
  subtitle: string | null;
}

export interface ListDayGroup {
  dayKey: string;
  title: string;
  subtitle: string | null;
  totals: string;
  notesInSubtitle: boolean;
  items: BabyEvent[];
}

export interface DayGroupContext {
  now: Date;
  timeZone: string;
  dayStartMinutes: number;
  units: Units;
  birthDate: string | null;
}

export function dayHeading(dayKey: string, todayKey: string): DayHeading {
  const label = formatDayLabel(dayKey, todayKey);
  return dayKey === todayKey || dayKey === shiftDay(todayKey, -1)
    ? { title: label, subtitle: formatDayDate(dayKey) }
    : { title: label, subtitle: null };
}

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function join(...parts: (string | null)[]): string {
  return parts.filter((part): part is string => part !== null).join(' · ');
}

function bottleMl(events: readonly BabyEvent[]): number {
  return events.reduce(
    (sum, event) =>
      event.type === 'bottle'
        ? sum + Math.max(0, (event.details.amountMl ?? 0) - (event.details.amountLeftMl ?? 0))
        : sum,
    0,
  );
}

function growthTotals(items: readonly BabyEvent[], older: readonly BabyEvent[], context: DayGroupContext): string {
  const latestWeight = (events: readonly BabyEvent[]) =>
    events
      .filter((event): event is Extract<BabyEvent, { type: 'growth' }> => event.type === 'growth')
      .filter((event) => event.details.weightG !== null)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const current = latestWeight(items);
  const previous = latestWeight(older);
  if (current && previous) {
    const change = formatWeightChange(current.details.weightG! - previous.details.weightG!, context.units);
    return `${change} since ${formatShortDate(previous.startedAt, context.timeZone)}`;
  }
  return count(items.length, 'measurement', 'measurements');
}

export function dayTotals(
  kind: StripKind,
  items: readonly BabyEvent[],
  context: DayGroupContext,
  older: readonly BabyEvent[] = [],
): string {
  const { now, units } = context;
  const duration = (ms: number) => (ms > 0 ? formatDuration(ms, { seconds: false }) : null);
  const volume = (ml: number) => (ml > 0 ? formatVolume(ml, units) : null);
  switch (kind) {
    case 'sleep': {
      const asleepMs = items.reduce(
        (sum, event) => (event.type === 'sleep' ? sum + summariseSleep(event, now).asleepMs : sum),
        0,
      );
      return join(count(items.length, 'sleep', 'sleeps'), duration(asleepMs));
    }
    case 'nappy': {
      const nappies = items.filter((event) => event.type === 'nappy');
      const wet = nappies.filter((event) => event.details.wet).length;
      const dirty = nappies.filter((event) => event.details.dirty).length;
      return join(String(items.length), wet ? `${wet} wet` : null, dirty ? `${dirty} dirty` : null);
    }
    case 'pump': {
      const ml = items.reduce((sum, event) => {
        if (event.type !== 'pump') return sum;
        const { leftMl, rightMl, totalMl } = event.details;
        return sum + (totalMl ?? (leftMl ?? 0) + (rightMl ?? 0));
      }, 0);
      return join(count(items.length, 'session', 'sessions'), volume(ml));
    }
    case 'bottle':
      return join(count(items.length, 'bottle', 'bottles'), volume(bottleMl(items)));
    case 'feeds':
    case 'breast': {
      const breastMs = items.reduce(
        (sum, event) => (event.type === 'breast_feed' ? sum + segmentTotals(event.segments, now).activeMs : sum),
        0,
      );
      return join(count(items.length, 'feed', 'feeds'), duration(breastMs), volume(bottleMl(items)));
    }
    case 'growth':
      return growthTotals(items, older, context);
    case 'custom':
      return count(items.length, 'event', 'events');
  }
}

export function listDayGroups(kind: StripKind, events: readonly BabyEvent[], context: DayGroupContext): ListDayGroup[] {
  const todayKey = dayKeyFor(context.now.toISOString(), context.timeZone, context.dayStartMinutes);
  const groups = groupByDay(events, context.timeZone, context.dayStartMinutes);
  return groups.map((group, index) => {
    const older = groups.slice(index + 1).flatMap((item) => item.items);
    const heading = dayHeading(group.dayKey, todayKey);
    const birthDate = kind === 'growth' ? context.birthDate : null;
    const isBirth =
      birthDate !== null && group.items.some((event) => dayKeyFor(event.startedAt, context.timeZone, 0) === birthDate);
    const note = kind === 'growth' && group.items.length === 1 ? group.items[0]!.notes?.trim() || null : null;
    const title = isBirth ? 'Birth' : heading.title;
    const subtitle = isBirth && birthDate ? formatDayDate(birthDate) : (heading.subtitle ?? note);
    return {
      dayKey: group.dayKey,
      title,
      subtitle,
      totals: dayTotals(kind, group.items, context, older),
      notesInSubtitle: note !== null && subtitle === note,
      items: group.items,
    };
  });
}
