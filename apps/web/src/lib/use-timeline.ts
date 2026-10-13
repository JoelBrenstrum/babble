import { babySettingsQuery, eventsBetweenQuery, type BabbleClient } from '@babble/api';
import {
  timelineModel,
  timelineRange,
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
