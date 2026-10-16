import type { StatsCard } from '../stats/cards';
import type { ChartBar } from '../stats/charts';
import type { DayLayout } from './day-layout';

export type TimelineLane = keyof DayLayout;

export const TIMELINE_LANES: readonly TimelineLane[] = ['sleep', 'feeds', 'nappies', 'pumps'];

export const TIMELINE_LANE_LABELS: Record<TimelineLane, string> = {
  sleep: 'Sleep',
  feeds: 'Feeds',
  nappies: 'Nappies',
  pumps: 'Pumps',
};

const isLane = (value: string): value is TimelineLane => (TIMELINE_LANES as readonly string[]).includes(value);

export function parseTimelineLanes(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const lanes = TIMELINE_LANES.filter((lane) => value.split(',').includes(lane));
  return lanes.length > 0 && lanes.length < TIMELINE_LANES.length ? lanes.join(',') : undefined;
}

export function shownLanes(show: string | undefined): TimelineLane[] {
  const lanes = show?.split(',').filter(isLane) ?? [];
  return lanes.length > 0 ? TIMELINE_LANES.filter((lane) => lanes.includes(lane)) : [...TIMELINE_LANES];
}

export function toggleLane(show: string | undefined, lane: TimelineLane): string | undefined {
  const shown = shownLanes(show);
  const next = shown.includes(lane) ? shown.filter((item) => item !== lane) : [...shown, lane];
  return parseTimelineLanes(next.join(',')) ?? (next.length === 0 ? show : undefined);
}

export function filterLayout(layout: DayLayout, lanes: readonly TimelineLane[]): DayLayout {
  if (lanes.length === TIMELINE_LANES.length) return layout;
  return {
    sleep: lanes.includes('sleep') ? layout.sleep : [],
    feeds: lanes.includes('feeds') ? layout.feeds : [],
    nappies: lanes.includes('nappies') ? layout.nappies : [],
    pumps: lanes.includes('pumps') ? layout.pumps : [],
  };
}

const CARD_LANES: Record<StatsCard['key'], TimelineLane> = {
  sleep: 'sleep',
  feeds: 'feeds',
  nappies: 'nappies',
  pump: 'pumps',
  wake: 'sleep',
  night: 'sleep',
};

export interface TimelineLink {
  view: 'day' | '7d';
  date: string;
  show: string;
}

export function statsBarLink(card: StatsCard['key'], bar: ChartBar, weekly: boolean): TimelineLink | null {
  const day = weekly ? (bar.lastDay ?? bar.label) : bar.label;
  if (bar.title || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return { view: weekly ? '7d' : 'day', date: day, show: CARD_LANES[card] };
}
