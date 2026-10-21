import {
  dayComparison,
  dayRhythm,
  dayRhythmWindow,
  feedDueFor,
  feedDueMarker,
  nightMarkers,
  previous24hWindow,
  previousDayWindow,
  rollingComparison,
  timelineModel,
  timelineRange,
  type BabyEvent,
  type DayComparison,
  type DayRhythm,
  type DaySummary,
  type FeedDueMarker,
  type NightMarker,
  type TimelineBaby,
  type TimelineLane,
  type TimelineModel,
  type TimelineRange,
  type TimelineView,
} from '@babble/domain';
import { skipToken, useQuery } from '@tanstack/react-query';
import type { BabbleClient } from '../client';
import { listEventsBetween } from '../events';
import { babySettingsQuery, eventsBetweenQuery, latestEventsQuery, queryKeys, runningEventsQuery } from '../queries';

export type TimelinePlaceholder = 'overlapping' | 'previous' | 'none';

type Range = Pick<TimelineRange, 'from' | 'to'>;

export function mostlyOverlaps(previous: Range | null, range: Range): boolean {
  if (!previous) return false;
  const start = Math.max(Date.parse(previous.from), Date.parse(range.from));
  const end = Math.min(Date.parse(previous.to), Date.parse(range.to));
  const span = Date.parse(range.to) - Date.parse(range.from);
  return end - start > span / 2;
}

function placeholderFor(placeholder: TimelinePlaceholder, range: Range) {
  return (
    previous: BabyEvent[] | undefined,
    previousQuery: { queryKey: readonly unknown[] } | undefined,
  ): BabyEvent[] | undefined => {
    if (placeholder === 'none' || !previousQuery) return undefined;
    if (placeholder === 'previous') return previous;
    return mostlyOverlaps(queryKeys.eventsBetweenRange(previousQuery.queryKey), range) ? previous : undefined;
  };
}

export function useTimelineModel(input: {
  client: BabbleClient;
  babyId: string;
  baby: TimelineBaby;
  view: TimelineView;
  date: string | null | undefined;
  now: Date;
  enabled: boolean;
  placeholder?: TimelinePlaceholder;
}): { range: TimelineRange; model: TimelineModel | null; pending: boolean } {
  const { client, babyId, baby, view, date, now, enabled, placeholder = 'overlapping' } = input;
  const range = timelineRange({ view, date, baby, now });
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  const events = useQuery({
    ...eventsBetweenQuery(client, babyId, range.from, range.to),
    enabled,
    placeholderData: placeholderFor(placeholder, range),
  });
  const model = events.data ? timelineModel({ view, date, events: events.data, settings, baby, now }) : null;
  return { range, model, pending: events.isPending };
}

export function useDayComparison(input: {
  client: BabbleClient;
  babyId: string;
  baby: TimelineBaby;
  dayKey: string;
  todayKey: string;
  current: DaySummary | null;
  now: Date;
  enabled: boolean;
}): DayComparison | null {
  const { client, babyId, baby, dayKey, todayKey, current, now, enabled } = input;
  const window = previousDayWindow(dayKey, baby);
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  const events = useQuery({
    ...eventsBetweenQuery(client, babyId, window.start.toISOString(), window.end.toISOString()),
    enabled,
  });
  if (!enabled || !current || !events.data) return null;
  return dayComparison({ dayKey, todayKey, current, events: events.data, settings, baby, now });
}

export function useDayRhythm(input: {
  client: BabbleClient;
  babyId: string;
  baby: TimelineBaby;
  dayKey: string;
  now: Date;
  enabled: boolean;
}): DayRhythm | null {
  const { client, babyId, baby, dayKey, now, enabled } = input;
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  const window = settings ? dayRhythmWindow(dayKey, baby, settings) : null;
  const events = useQuery({
    queryKey: window
      ? queryKeys.eventsBetween(babyId, window.start.toISOString(), window.end.toISOString())
      : queryKeys.eventsBetweenAny(babyId),
    queryFn: window
      ? () => listEventsBetween(client, babyId, window.start.toISOString(), window.end.toISOString())
      : skipToken,
    enabled,
  });
  if (!enabled || !settings || !events.data) return null;
  return dayRhythm({ events: events.data, dayKey, now, settings, baby });
}

export function useRollingComparison(input: {
  client: BabbleClient;
  babyId: string;
  baby: TimelineBaby;
  window: { start: Date; end: Date } | null;
  current: DaySummary | null;
  enabled: boolean;
  placeholder?: TimelinePlaceholder;
}): DayComparison | null {
  const { client, babyId, baby, window, current, enabled, placeholder = 'overlapping' } = input;
  const previous = window ? previous24hWindow(window) : null;
  const range = previous ? { from: previous.start.toISOString(), to: previous.end.toISOString() } : null;
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  const events = useQuery({
    queryKey: range ? queryKeys.eventsBetween(babyId, range.from, range.to) : queryKeys.eventsBetweenAny(babyId),
    queryFn: range ? () => listEventsBetween(client, babyId, range.from, range.to) : skipToken,
    enabled,
    placeholderData: range ? placeholderFor(placeholder, range) : undefined,
  });
  if (!enabled || !window || !current || !events.data) return null;
  return rollingComparison({ window, current, events: events.data, settings, baby });
}

export function useTimelineMarkers(input: {
  client: BabbleClient;
  babyId: string;
  timeZone: string;
  model: TimelineModel | null;
  now: Date;
  lanes: readonly TimelineLane[];
  enabled: boolean;
}): { feedDue: FeedDueMarker | null; night: NightMarker[] } {
  const { client, babyId, timeZone, model, now, lanes, enabled } = input;
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  const latest = useQuery({ ...latestEventsQuery(client, babyId), enabled }).data;
  const running = useQuery({ ...runningEventsQuery(client, babyId), enabled }).data;
  const window = model?.view === 'day' ? model.day.window : model?.view === '24h' ? model.window : null;
  const due = enabled ? feedDueFor(latest ?? [], running ?? [], settings, now, timeZone) : null;
  return {
    feedDue: window && lanes.includes('feeds') ? feedDueMarker(due, window, now, timeZone) : null,
    night: window ? nightMarkers(window, settings, timeZone) : [],
  };
}
