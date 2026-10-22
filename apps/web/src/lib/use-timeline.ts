import { babySettingsQuery, type BabbleClient } from '@babble/api';
import { useEventsInRange } from '@babble/api/react';
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
  const events = useEventsInRange(client, babyId, {
    from: range.from,
    to: range.to,
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
    enabled,
    keepPrevious: view === '24h',
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
  const events = useEventsInRange(client, babyId, {
    from: window.start.toISOString(),
    to: window.end.toISOString(),
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
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
  const events = useEventsInRange(client, babyId, {
    ...range,
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
    enabled: enabled && previous !== null,
    keepPrevious: true,
  });
  if (!enabled || !window || !current || !events.data) return null;
  return rollingComparison({ window, current, events: events.data, settings, baby });
}
