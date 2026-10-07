import { eventQuery, runningEventsQuery, toBabbleError } from '@babble/api';
import { formatDuration, formatTimeOfDay, segmentTotals } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { Card, SectionLabel } from '#/components/ui/card';
import { Spinner } from '#/components/ui/spinner';
import { StatusMessage } from '#/components/ui/status';
import { RunningCard } from '#/features/events/running-card';
import { useNow } from '#/lib/use-now';

export const Route = createFileRoute('/_app/sessions/$eventId')({ component: SessionPage });

function SessionPage() {
  const { babble, baby, family } = Route.useRouteContext();
  const { eventId } = Route.useParams();
  const running = useQuery(runningEventsQuery(babble.client, baby.id));
  const fallback = useQuery({ ...eventQuery(babble.client, baby.id, eventId), enabled: running.isSuccess });
  const now = useNow(1000);
  const event = running.data?.find((item) => item.id === eventId) ?? fallback.data;

  if (!event) {
    if (running.isPending || fallback.isPending) {
      return (
        <div className="flex justify-center py-16 text-primary">
          <Spinner className="size-7" />
        </div>
      );
    }
    return (
      <StatusMessage tone="danger">
        {fallback.error ? toBabbleError(fallback.error).message : 'Session not found.'}
      </StatusMessage>
    );
  }
  if (event.endedAt !== null) return <Navigate to="/events/$eventId" params={{ eventId }} replace />;

  const segments = event.type === 'breast_feed' || event.type === 'pump' ? event.segments : [];
  const totals = segmentTotals(segments, now);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link to="/" aria-label="Back" className="grid size-tap place-items-center rounded-full hover:bg-surface">
          <ChevronLeft className="size-6" strokeWidth={2.75} />
        </Link>
        <h1 className="text-title font-bold">
          {event.type === 'sleep' ? 'Sleep' : event.type === 'pump' ? 'Pump' : 'Breastfeed'}
        </h1>
        <span className="ml-auto text-meta text-ink-2">started {formatTimeOfDay(event.startedAt, baby.timezone)}</span>
      </div>
      <RunningCard event={event} client={babble.client} timeZone={baby.timezone} members={family.members} />
      {segments.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionLabel>Session</SectionLabel>
          <Card className="divide-y divide-line">
            {segments.map((segment) => (
              <div key={segment.startedAt} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={
                    segment.side === 'left' ? 'size-3 rounded-full bg-feed-left' : 'size-3 rounded-full bg-feed-right'
                  }
                />
                <span className="flex-1 text-body font-semibold">{segment.side === 'left' ? 'Left' : 'Right'}</span>
                {segment.endedAt === null && (
                  <span className="text-meta font-semibold text-on-feed-right">running</span>
                )}
                <span className="tabular text-body">
                  {formatDuration(
                    (segment.endedAt ? Date.parse(segment.endedAt) : now.getTime()) - Date.parse(segment.startedAt),
                  )}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 text-meta text-ink-2">
              <span>Total {event.type === 'pump' ? 'pumping' : 'feeding'}</span>
              <span className="tabular font-semibold text-ink">{formatDuration(totals.activeMs)}</span>
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
