import { summariseDay, type DaySummary } from '../events/day-summary';
import { otherSide, segmentTotals } from '../events/segments';
import type { BabyEvent, PooColour, Units } from '../events/types';
import { formatDuration } from '../format/duration';
import { formatVolume, formatWeightChange } from '../format/units';
import { growthReport, type BabySex } from '../growth/growth';
import { formatShortDate, formatTimeOfDay, dayWindow, dayKeyFor, shiftDay } from '../time/local-time';
import { lastDays } from '../timeline/days';
import { bucketByDay } from '../timeline/day-layout';
import { isSessionType, type TrackerKey } from '../trackers';

export type StripKind = 'feeds' | 'breast' | 'bottle' | 'sleep' | 'nappy' | 'pump' | 'growth' | 'custom';

export interface StripItem {
  label: string;
  value: string;
  note?: string;
  swatch?: PooColour;
}

export interface StripContext {
  now: Date;
  timeZone: string;
  dayStartMinutes: number;
  nightStartMinutes: number;
  nightEndMinutes: number;
  units: Units;
  birthDate: string;
  sex: BabySex | null;
}

const DAY_MS = 86_400_000;
const AVERAGE_DAYS = 7;

export function stripKind(type: TrackerKey, filter: 'all' | 'breast' | 'bottle'): StripKind {
  if (type === 'breast_feed' || type === 'bottle') return filter === 'all' ? 'feeds' : filter;
  return type;
}

const KIND_TYPES: Record<StripKind, readonly TrackerKey[]> = {
  feeds: ['breast_feed', 'bottle'],
  breast: ['breast_feed'],
  bottle: ['bottle'],
  sleep: ['sleep'],
  nappy: ['nappy'],
  pump: ['pump'],
  growth: ['growth'],
  custom: ['custom'],
};

const LAST_LABEL: Record<StripKind, string> = {
  feeds: 'Last feed',
  breast: 'Last feed',
  bottle: 'Last bottle',
  sleep: 'Awake for',
  nappy: 'Last change',
  pump: 'Last pump',
  growth: 'Last',
  custom: 'Last',
};

const RUNNING_LABEL: Partial<Record<StripKind, string>> = {
  feeds: 'Feeding for',
  breast: 'Feeding for',
  sleep: 'Asleep for',
  pump: 'Pumping for',
};

export function stripWindow(now: Date, timeZone: string, dayStartMinutes: number): { from: string; to: string } {
  const todayKey = dayKeyFor(now.toISOString(), timeZone, dayStartMinutes);
  return {
    from: dayWindow(shiftDay(todayKey, -AVERAGE_DAYS), timeZone, dayStartMinutes).start.toISOString(),
    to: dayWindow(todayKey, timeZone, dayStartMinutes).end.toISOString(),
  };
}

export function sinceItem(kind: StripKind, events: readonly BabyEvent[], context: StripContext): StripItem {
  const latest = events.reduce<BabyEvent | null>(
    (newest, event) => (!newest || event.startedAt > newest.startedAt ? event : newest),
    null,
  );
  const running = latest && latest.endedAt === null && isSessionType(latest.type) ? latest : null;
  if (running) {
    return {
      label: RUNNING_LABEL[kind] ?? LAST_LABEL[kind],
      value: formatDuration(context.now.getTime() - Date.parse(running.startedAt), { seconds: false }),
      note: `since ${formatTimeOfDay(running.startedAt, context.timeZone)}`,
    };
  }
  const label = LAST_LABEL[kind];
  if (!latest) return { label, value: '—' };
  const at = latest.endedAt ?? latest.startedAt;
  const ms = context.now.getTime() - Date.parse(at);
  if (ms < 60_000) return { label, value: 'Just now' };
  if (ms < DAY_MS) {
    return {
      label,
      value: formatDuration(ms, { seconds: false }),
      note: `ago · ${formatTimeOfDay(at, context.timeZone)}`,
    };
  }
  const days = Math.floor(ms / DAY_MS);
  return {
    label,
    value: `${days} ${days === 1 ? 'day' : 'days'}`,
    note: `ago · ${formatShortDate(at, context.timeZone)}`,
  };
}

const perDay = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));
const hours = (ms: number) => formatDuration(ms, { seconds: false });

function summaries(events: readonly BabyEvent[], context: StripContext) {
  const todayKey = dayKeyFor(context.now.toISOString(), context.timeZone, context.dayStartMinutes);
  const firstKey = events.reduce((earliest, event) => {
    const key = dayKeyFor(event.startedAt, context.timeZone, context.dayStartMinutes);
    return key < earliest ? key : earliest;
  }, todayKey);
  const pastKeys = lastDays(shiftDay(todayKey, -1), AVERAGE_DAYS).filter((key) => key >= firstKey);
  const days = bucketByDay(events, [...pastKeys, todayKey], context.timeZone, context.dayStartMinutes, context.now).map(
    (day) =>
      summariseDay(day.events, day.window, {
        now: context.now,
        night: {
          dayKey: day.dayKey,
          timeZone: context.timeZone,
          startMinutes: context.nightStartMinutes,
          endMinutes: context.nightEndMinutes,
        },
      }),
  );
  const today = days.at(-1)!;
  const past = days.slice(0, -1);
  const average = (pick: (day: DaySummary) => number) =>
    past.length ? past.reduce((total, day) => total + pick(day), 0) / past.length : null;
  return { today, past, average };
}

function todayItem(
  label: string,
  value: string,
  average: number | null,
  format: (value: number) => string = perDay,
): StripItem {
  return average === null ? { label, value } : { label, value, note: `avg ${format(average)}` };
}

function growthItems(events: readonly BabyEvent[], context: StripContext): StripItem[] {
  const report = growthReport(
    events,
    { birthDate: context.birthDate, sex: context.sex, timeZone: context.timeZone },
    context.units,
  );
  const measure = (key: 'weight' | 'length', label: string): StripItem => {
    const chart = report.charts.find((item) => item.key === key);
    if (!chart) return { label, value: '—' };
    return chart.latest.percentile
      ? { label, value: chart.latest.value, note: `${chart.latest.percentile} percentile` }
      : { label, value: chart.latest.value };
  };
  const weights = events
    .filter((event): event is Extract<BabyEvent, { type: 'growth' }> => event.type === 'growth')
    .filter((event) => event.details.weightG !== null)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const [latest, previous] = weights;
  const change: StripItem =
    latest && previous
      ? {
          label: 'Change',
          value: formatWeightChange(latest.details.weightG! - previous.details.weightG!, context.units),
          note: daysBetweenNote(previous.startedAt, latest.startedAt, context),
        }
      : { label: 'Change', value: '—' };
  return [measure('weight', 'Weight'), change, measure('length', 'Length')];
}

function daysBetweenNote(from: string, to: string, context: StripContext): string {
  const key = (iso: string) => Date.parse(`${dayKeyFor(iso, context.timeZone, 0)}T00:00:00Z`);
  const days = Math.round((key(to) - key(from)) / DAY_MS);
  return days === 0 ? 'same day' : `in ${days} ${days === 1 ? 'day' : 'days'}`;
}

export function listStrip(kind: StripKind, events: readonly BabyEvent[], context: StripContext): StripItem[] {
  const types = KIND_TYPES[kind];
  const unique = [...new Map(events.map((event) => [event.id, event])).values()];
  const relevant = unique.filter((event) => !event.deletedAt && types.includes(event.type));
  if (kind === 'growth') return growthItems(relevant, context);

  const since = sinceItem(kind, relevant, context);
  const { today, past, average } = summaries(relevant, context);
  const volume = (ml: number) => formatVolume(ml, context.units);

  switch (kind) {
    case 'feeds':
    case 'breast': {
      const count = (day: DaySummary) => (kind === 'breast' ? day.feeds - day.bottles : day.feeds);
      const lastBreast = relevant
        .filter((event): event is Extract<BabyEvent, { type: 'breast_feed' }> => event.type === 'breast_feed')
        .reduce<Extract<BabyEvent, { type: 'breast_feed' }> | null>(
          (newest, event) => (!newest || event.startedAt > newest.startedAt ? event : newest),
          null,
        );
      const lastSide = lastBreast ? segmentTotals(lastBreast.segments, context.now).lastSide : null;
      return [
        since,
        todayItem('Today', String(count(today)), average(count)),
        { label: 'Next side', value: lastSide ? capitalise(otherSide(lastSide)) : '—' },
      ];
    }
    case 'bottle': {
      const all = [...past, today];
      const bottles = all.reduce((total, day) => total + day.bottles, 0);
      const ml = all.reduce((total, day) => total + day.bottleMl, 0);
      return [
        since,
        todayItem(
          'Today',
          volume(today.bottleMl),
          average((day) => day.bottleMl),
          volume,
        ),
        { label: 'Per bottle', value: bottles ? volume(ml / bottles) : '—' },
      ];
    }
    case 'sleep':
      return [
        since,
        todayItem(
          'Today',
          hours(today.sleepMs),
          average((day) => day.sleepMs),
          hours,
        ),
        todayItem(
          'Naps',
          String(today.naps),
          average((day) => day.naps),
        ),
      ];
    case 'nappy': {
      const lastPoo = relevant
        .filter((event): event is Extract<BabyEvent, { type: 'nappy' }> => event.type === 'nappy')
        .filter((event) => event.details.dirty && event.details.pooColours.length > 0)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
      const dirty = todayItem(
        'Dirty today',
        String(today.dirty),
        average((day) => day.dirty),
      );
      return [
        since,
        todayItem(
          'Wet today',
          String(today.wet),
          average((day) => day.wet),
        ),
        lastPoo ? { ...dirty, swatch: lastPoo.details.pooColours[0] } : dirty,
      ];
    }
    case 'pump': {
      const amount = (ml: number) => volume(ml).split(' ')[0];
      return [
        since,
        todayItem(
          'Today',
          volume(today.pumpMl),
          average((day) => day.pumpMl),
          volume,
        ),
        {
          label: 'Left / right',
          value: `${amount(today.pumpLeftMl)} / ${amount(today.pumpRightMl)}`,
          note: context.units === 'metric' ? 'ml today' : 'oz today',
        },
      ];
    }
    case 'custom': {
      const todayKey = dayKeyFor(context.now.toISOString(), context.timeZone, context.dayStartMinutes);
      const weekStart = dayWindow(lastDays(todayKey, 7)[0]!, context.timeZone, context.dayStartMinutes).start;
      const todayStart = dayWindow(todayKey, context.timeZone, context.dayStartMinutes).start;
      const countFrom = (start: Date) =>
        relevant.filter((event) => Date.parse(event.startedAt) >= start.getTime()).length;
      return [
        since,
        { label: 'Today', value: String(countFrom(todayStart)) },
        { label: '7 days', value: String(countFrom(weekStart)) },
      ];
    }
  }
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
