import type { DaySummary, WeekSummary } from '../events/day-summary';
import type { NappyDetails, Units } from '../events/types';
import { formatDuration } from '../format/duration';
import { formatVolume } from '../format/units';
import { formatTimeOfDay } from '../time/local-time';

export type TotalKey = 'sleep' | 'feeds' | 'nappies' | 'pump';

export interface TotalCard {
  key: TotalKey;
  label: string;
  value: string;
  details: { label: string; value: string }[];
}

const hours = (ms: number) => formatDuration(ms, { seconds: false });

export function dayTotalCards(summary: DaySummary, units: Units, timeZone: string): TotalCard[] {
  const cards: TotalCard[] = [
    {
      key: 'sleep',
      label: 'Sleep',
      value: hours(summary.sleepMs),
      details: [
        { label: 'Naps', value: summary.naps ? `${summary.naps} · ${hours(summary.napMs)}` : '—' },
        { label: 'Night', value: summary.nightMs ? hours(summary.nightMs) : '—' },
        { label: 'Longest', value: summary.longestSleepMs ? hours(summary.longestSleepMs) : '—' },
      ],
    },
    {
      key: 'feeds',
      label: 'Feeds',
      value: String(summary.feeds),
      details: [
        { label: 'Left', value: summary.leftMs ? hours(summary.leftMs) : '—' },
        { label: 'Right', value: summary.rightMs ? hours(summary.rightMs) : '—' },
        { label: 'Idle', value: summary.idleMs ? hours(summary.idleMs) : '—' },
        {
          label: 'Bottle',
          value: summary.bottles ? `${summary.bottles} · ${formatVolume(summary.bottleMl, units)}` : '—',
        },
      ],
    },
    {
      key: 'nappies',
      label: 'Nappies',
      value: String(summary.nappies),
      details: [
        { label: 'Wet', value: String(summary.wet) },
        { label: 'Dirty', value: String(summary.dirty) },
        { label: 'Last', value: summary.lastNappyAt ? formatTimeOfDay(summary.lastNappyAt, timeZone) : '—' },
      ],
    },
  ];
  if (summary.pumps > 0) {
    cards.push({
      key: 'pump',
      label: 'Pump',
      value: formatVolume(summary.pumpMl, units),
      details: [
        { label: 'Sessions', value: String(summary.pumps) },
        { label: 'Left', value: formatVolume(summary.pumpLeftMl, units) },
        { label: 'Right', value: formatVolume(summary.pumpRightMl, units) },
      ],
    });
  }
  return cards;
}

export function daySummaryStrip(summary: DaySummary): { label: string; value: string }[] {
  return [
    { label: 'Sleep', value: hours(summary.sleepMs) },
    { label: 'Feeds', value: String(summary.feeds) },
    { label: 'Nappies', value: String(summary.nappies) },
  ];
}

const perDay = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

export function weekSummaryStrip(week: WeekSummary): { label: string; value: string }[] {
  if (week.days === 0) {
    return [
      { label: 'Avg sleep', value: '—' },
      { label: 'Longest', value: '—' },
      { label: 'Feeds/day', value: '—' },
    ];
  }
  return [
    { label: 'Avg sleep', value: hours(week.averageSleepMs) },
    { label: 'Longest', value: hours(week.longestSleepMs) },
    { label: 'Feeds/day', value: perDay(week.feedsPerDay) },
  ];
}

export interface WeekRow {
  key: TotalKey | 'longest' | 'left' | 'right' | 'idle' | 'bottle';
  label: string;
  values: (string | null)[];
  average: string;
}

export function weekTableRows(days: (DaySummary | null)[], week: WeekSummary, units: Units): WeekRow[] {
  const each = (pick: (day: DaySummary) => string) => days.map((day) => (day ? pick(day) : null));
  const counted = days.filter((day): day is DaySummary => day !== null).slice(0, week.days || undefined);
  const average = (pick: (day: DaySummary) => number) =>
    counted.length ? counted.reduce((total, day) => total + pick(day), 0) / counted.length : 0;
  const ml = (value: number) => (value ? formatVolume(value, units) : '—');
  return [
    { key: 'sleep', label: 'Sleep', values: each((day) => hours(day.sleepMs)), average: hours(week.averageSleepMs) },
    {
      key: 'longest',
      label: 'Longest stretch',
      values: each((day) => (day.longestSleepMs ? hours(day.longestSleepMs) : '—')),
      average: hours(average((day) => day.longestSleepMs)),
    },
    { key: 'feeds', label: 'Feeds', values: each((day) => String(day.feeds)), average: perDay(week.feedsPerDay) },
    ...(['left', 'right', 'idle'] as const).map((side) => {
      const pick = (day: DaySummary) => day[`${side}Ms`];
      return {
        key: side,
        label: { left: 'Left', right: 'Right', idle: 'Idle' }[side],
        values: each((day) => (pick(day) ? hours(pick(day)) : '—')),
        average: hours(average(pick)),
      };
    }),
    {
      key: 'bottle',
      label: 'Bottle',
      values: each((day) => ml(day.bottleMl)),
      average: ml(average((day) => day.bottleMl)),
    },
    {
      key: 'nappies',
      label: 'Nappies',
      values: each((day) => String(day.nappies)),
      average: perDay(week.nappiesPerDay),
    },
  ];
}

export function feedTimeSplit(time: Pick<DaySummary, 'leftMs' | 'rightMs' | 'idleMs'>): string {
  if (!time.leftMs && !time.rightMs) return '—';
  const parts = [`L ${hours(time.leftMs)}`, `R ${hours(time.rightMs)}`];
  if (time.idleMs >= 60_000) parts.push(`idle ${hours(time.idleMs)}`);
  return parts.join(' · ');
}

export function countedDays(dayKeys: readonly string[], todayKey: string): string[] {
  const past = dayKeys.filter((key) => key < todayKey);
  return past.length ? past : dayKeys.filter((key) => key === todayKey);
}

export function nappyKind(details: Pick<NappyDetails, 'wet' | 'dirty'>): string {
  if (details.wet && details.dirty) return 'Both';
  if (details.dirty) return 'Dirty';
  if (details.wet) return 'Wet';
  return 'Dry';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDayRange(dayKeys: readonly string[]): string {
  const [, firstMonth, firstDay] = dayKeys[0]!.split('-').map(Number) as [number, number, number];
  const [, lastMonth, lastDay] = dayKeys.at(-1)!.split('-').map(Number) as [number, number, number];
  const end = `${lastDay} ${MONTHS[lastMonth - 1]}`;
  return firstMonth === lastMonth ? `${firstDay} – ${end}` : `${firstDay} ${MONTHS[firstMonth - 1]} – ${end}`;
}

export function weekdayLabel(dayKey: string): { weekday: string; day: string } {
  const [year, month, day] = dayKey.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    weekday: new Intl.DateTimeFormat('en-NZ', { timeZone: 'UTC', weekday: 'short' }).format(date),
    day: String(day),
  };
}
