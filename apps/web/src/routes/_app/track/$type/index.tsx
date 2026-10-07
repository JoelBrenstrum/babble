import { eventListQuery } from '@babble/api';
import { dayKeyFor, formatDayLabel, formatDuration, groupByDay, segmentTotals, type BabyEvent } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { EmptyState } from '#/components/ui/empty-state';
import { Segmented } from '#/components/ui/segmented';
import { Spinner } from '#/components/ui/spinner';
import { TrackerIcon } from '#/components/ui/tracker-icon';
import { EventRow } from '#/features/events/event-row';
import { isEventType, listTypesFor, trackerFor } from '@babble/domain';
import { useUnits } from '#/lib/use-events';
import { useNow } from '#/lib/use-now';

type Filter = 'all' | 'breast' | 'bottle';

export const Route = createFileRoute('/_app/track/$type/')({
  validateSearch: (search: Record<string, unknown>): { filter?: Filter } => ({
    filter:
      search.filter === 'breast' || search.filter === 'bottle' || search.filter === 'all' ? search.filter : undefined,
  }),
  beforeLoad: ({ params }) => {
    if (!isEventType(params.type)) throw notFound();
    return { eventType: params.type };
  },
  component: TrackerList,
});

function dayTotals(events: BabyEvent[]): string {
  const feeds = events.filter((event) => event.type === 'breast_feed' || event.type === 'bottle').length;
  const activeMs = events.reduce((sum, event) => {
    if (event.type === 'breast_feed' || event.type === 'pump')
      return sum + segmentTotals(event.segments, new Date()).activeMs;
    if (event.type === 'sleep' && event.endedAt) return sum + Date.parse(event.endedAt) - Date.parse(event.startedAt);
    return sum;
  }, 0);
  const count = feeds || events.length;
  const noun = feeds ? (count === 1 ? 'feed' : 'feeds') : count === 1 ? 'entry' : 'entries';
  return activeMs > 0 ? `${count} ${noun} · ${formatDuration(activeMs, { seconds: false })}` : `${count} ${noun}`;
}

function TrackerList() {
  const { babble, baby, family, eventType } = Route.useRouteContext();
  const { filter = eventType === 'bottle' ? 'bottle' : eventType === 'breast_feed' ? 'breast' : 'all' } =
    Route.useSearch();
  const navigate = useNavigate();
  const now = useNow(30_000);
  const units = useUnits(babble.client, baby.id);
  const types = listTypesFor(eventType, filter);
  const events = useQuery(eventListQuery(babble.client, baby.id, types));
  const tracker = trackerFor(eventType);
  const isFeed = eventType === 'breast_feed' || eventType === 'bottle';
  const todayKey = dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes);
  const groups = groupByDay(events.data ?? [], baby.timezone, baby.day_start_minutes);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <TrackerIcon tracker={tracker} />
        <h1 className="flex-1 text-title font-bold">{isFeed ? 'Feeds' : tracker.pluralLabel}</h1>
        <Link
          to="/track/$type/new"
          params={{ type: eventType === 'breast_feed' && filter === 'bottle' ? 'bottle' : eventType }}
          aria-label={`Add ${tracker.label.toLowerCase()}`}
          className="grid size-tap place-items-center rounded-full bg-primary text-on-primary"
        >
          <Plus className="size-5" strokeWidth={2.75} />
        </Link>
      </div>

      {isFeed && (
        <Segmented
          label="Show"
          value={filter}
          onChange={(next) => void navigate({ to: '.', search: { filter: next } })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'breast', label: 'Breast' },
            { value: 'bottle', label: 'Bottle' },
          ]}
        />
      )}

      {events.isPending && (
        <div className="flex justify-center py-16 text-primary">
          <Spinner className="size-7" />
        </div>
      )}
      {events.data?.length === 0 && (
        <EmptyState
          illustration={<TrackerIcon tracker={tracker} size="lg" />}
          title={`No ${tracker.pluralLabel.toLowerCase()} yet`}
          action={
            <Link
              to="/track/$type/new"
              params={{ type: filter === 'bottle' ? 'bottle' : eventType }}
              className="inline-flex h-tap items-center gap-2 rounded-button bg-primary px-5 font-semibold text-on-primary hover:bg-on-primary-soft"
            >
              <Plus className="size-5" strokeWidth={2.75} />
              Log {(filter === 'bottle' ? trackerFor('bottle') : tracker).label.toLowerCase()}
            </Link>
          }
        >
          Entries you log will show up here, grouped by day.
        </EmptyState>
      )}
      {groups.map((group) => (
        <section key={group.dayKey} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-section font-semibold uppercase text-ink-3">
              {formatDayLabel(group.dayKey, todayKey)}
            </h2>
            <span className="text-meta text-ink-2">{dayTotals(group.items)}</span>
          </div>
          <Card className="divide-y divide-line overflow-hidden">
            {group.items.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                members={family.members}
                timeZone={baby.timezone}
                units={units}
                now={now}
                showTitle={isFeed && filter === 'all'}
              />
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
