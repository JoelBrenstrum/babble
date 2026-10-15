import { babySettingsQuery, eventListQuery, eventsBetweenQuery, familyAuthors } from '@babble/api';
import { hasStrip, listDayGroups, listStrip, mergeableFeeds, stripKind, stripWindow } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router';
import { Fragment } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { EmptyState } from '#/components/ui/empty-state';
import { Segmented } from '#/components/ui/segmented';
import { SectionSpinner } from '#/components/ui/spinner';
import { TrackerIcon } from '#/components/ui/tracker-icon';
import { EventRow } from '#/features/events/event-row';
import { MergeFeedsRow } from '#/features/events/merge-feeds';
import { SummaryStrip } from '#/features/timeline/totals';
import { isEventType, listTypesFor, trackerFor } from '@babble/domain';
import { useUnits } from '@babble/api/react';
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

function TrackerList() {
  const { babble, baby, family, eventType, canLog } = Route.useRouteContext();
  const { filter = eventType === 'bottle' ? 'bottle' : eventType === 'breast_feed' ? 'breast' : 'all' } =
    Route.useSearch();
  const navigate = useNavigate();
  const now = useNow(30_000);
  const units = useUnits(babble.client, baby.id);
  const types = listTypesFor(eventType, filter);
  const events = useQuery(eventListQuery(babble.client, baby.id, types));
  const tracker = trackerFor(eventType);
  const isFeed = eventType === 'breast_feed' || eventType === 'bottle';
  const kind = stripKind(eventType, filter);
  const groups = listDayGroups(kind, events.data ?? [], {
    now,
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
    units,
    birthDate: baby.birth_date,
  });
  const settings = useQuery(babySettingsQuery(babble.client, baby.id)).data;
  const merges = canLog && types.includes('breast_feed') ? mergeableFeeds(events.data ?? []) : null;
  const stripRange = stripWindow(now, baby.timezone, baby.day_start_minutes);
  const showStrip = hasStrip(kind);
  const recent = useQuery({
    ...eventsBetweenQuery(babble.client, baby.id, stripRange.from, stripRange.to),
    enabled: showStrip,
  });
  const strip =
    showStrip && events.data?.length && recent.data && settings
      ? listStrip(kind, [...recent.data, ...events.data], {
          now,
          timeZone: baby.timezone,
          dayStartMinutes: baby.day_start_minutes,
          nightStartMinutes: settings.night_start_minutes,
          nightEndMinutes: settings.night_end_minutes,
          units,
          birthDate: baby.birth_date,
          sex: baby.sex,
        })
      : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <TrackerIcon tracker={tracker} />
        <h1 className="flex-1 text-title font-bold">{isFeed ? 'Feeds' : tracker.pluralLabel}</h1>
        {canLog && (
          <Link
            to="/track/$type/new"
            params={{ type: eventType === 'breast_feed' && filter === 'bottle' ? 'bottle' : eventType }}
            aria-label={`Add ${tracker.label.toLowerCase()}`}
            className="grid size-tap place-items-center rounded-full bg-primary text-on-primary"
          >
            <Plus className="size-5" strokeWidth={2.75} />
          </Link>
        )}
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

      {strip && (
        <div className="relative rounded-card hover:opacity-90">
          <SummaryStrip items={strip} />
          <Link to="/stats" aria-label="Open stats" className="absolute inset-0 rounded-card" />
        </div>
      )}

      {events.isPending && <SectionSpinner />}
      {events.data?.length === 0 && (
        <EmptyState
          illustration={<TrackerIcon tracker={tracker} size="lg" />}
          title={`No ${tracker.pluralLabel.toLowerCase()} yet`}
          action={
            canLog && (
              <Link
                to="/track/$type/new"
                params={{ type: filter === 'bottle' ? 'bottle' : eventType }}
                className="inline-flex h-tap items-center gap-2 rounded-button bg-primary px-5 font-semibold text-on-primary hover:bg-on-primary-soft"
              >
                <Plus className="size-5" strokeWidth={2.75} />
                Log {(filter === 'bottle' ? trackerFor('bottle') : tracker).label.toLowerCase()}
              </Link>
            )
          }
        >
          Entries you log will show up here, grouped by day.
        </EmptyState>
      )}
      {groups.map((group) => (
        <section key={group.dayKey} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2 px-1">
            <div className="flex min-w-0 items-baseline gap-2">
              <h2 className="shrink-0 text-body font-bold">{group.title}</h2>
              {group.subtitle && <span className="truncate text-meta text-ink-3">{group.subtitle}</span>}
            </div>
            <span className="tabular shrink-0 text-right text-meta font-semibold text-ink-2">{group.totals}</span>
          </div>
          <Card className="divide-y divide-line overflow-hidden">
            {group.items.map((event) => {
              const merge = merges?.get(event.id);
              return (
                <Fragment key={event.id}>
                  <EventRow
                    event={event}
                    members={familyAuthors(family)}
                    timeZone={baby.timezone}
                    units={units}
                    now={now}
                    showTitle={(isFeed && filter === 'all') || eventType === 'custom'}
                    showNotes={!group.notesInSubtitle}
                  />
                  {merge && group.items.some((item) => item.id === merge.earlierId) && (
                    <MergeFeedsRow client={babble.client} babyId={baby.id} merge={merge} />
                  )}
                </Fragment>
              );
            })}
          </Card>
        </section>
      ))}
    </div>
  );
}
