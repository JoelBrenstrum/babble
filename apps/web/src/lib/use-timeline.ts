import { babySettingsQuery, eventsBetweenQuery, type BabbleClient } from '@babble/api';
import {
  dayComparison,
  previous24hWindow,
  previousDayWindow,
  rollingComparison,
  timelineModel,
  timelineRange,
  type DayComparison,
  type DaySummary,
  type TimelineBaby,
  type TimelineModel,
  type TimelineRange,
  type TimelineView,
} from '@babble/domain';
import { useQuery } from '@tanstack/react-query';

export function mostlyOverlaps(previousKey: readonly unknown[], range: Pick<TimelineRange, 'from' | 'to'>): boolean {
  const [, , , from, to] = previousKey;
  if (typeof from !== 'string' || typeof to !== 'string') return false;
  const start = Math.max(Date.parse(from), Date.parse(range.from));
  const end = Math.min(Date.parse(to), Date.parse(range.to));
  const span = Date.parse(range.to) - Date.parse(range.from);
  return end - start > span / 2;
}

export function useTimelineModel(input: {
  client: BabbleClient;
  babyId: string;
  baby: TimelineBaby;
  view: TimelineView;
  date: string | undefined;
  now: Date;
  enabled: boolean;
}): { range: TimelineRange; model: TimelineModel | null } {
  const { client, babyId, baby, view, date, now, enabled } = input;
  const range = timelineRange({ view, date, baby, now });
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  const events = useQuery({
    ...eventsBetweenQuery(client, babyId, range.from, range.to),
    enabled,
    placeholderData: (previous, previousQuery) =>
      previousQuery && mostlyOverlaps(previousQuery.queryKey, range) ? previous : undefined,
  });
  const model = events.data ? timelineModel({ view, date, events: events.data, settings, baby, now }) : null;
  return { range, model };
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

export function useRollingComparison(input: {
  client: BabbleClient;
  babyId: string;
  baby: TimelineBaby;
  window: { start: Date; end: Date } | null;
  current: DaySummary | null;
  enabled: boolean;
}): DayComparison | null {
  const { client, babyId, baby, window, current, enabled } = input;
  const previous = window ? previous24hWindow(window) : null;
  const range = previous
    ? { from: previous.start.toISOString(), to: previous.end.toISOString() }
    : { from: new Date(0).toISOString(), to: new Date(0).toISOString() };
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  const events = useQuery({
    ...eventsBetweenQuery(client, babyId, range.from, range.to),
    enabled: enabled && previous !== null,
    placeholderData: (data, previousQuery) =>
      previousQuery && mostlyOverlaps(previousQuery.queryKey, range) ? data : undefined,
  });
  if (!enabled || !window || !current || !events.data) return null;
  return rollingComparison({ window, current, events: events.data, settings, baby });
}
