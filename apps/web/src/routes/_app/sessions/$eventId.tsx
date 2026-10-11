import { clock, eventQuery, runningEventsQuery, toBabbleError } from '@babble/api';
import { formatTimeOfDay, trimIdleSwitch } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { Card, SectionLabel } from '#/components/ui/card';
import { Spinner } from '#/components/ui/spinner';
import { StatusMessage } from '#/components/ui/status';
import { RunningCard } from '#/features/events/running-card';
import { KeepAwakeToggle } from '#/features/keep-awake-toggle';
import { NapBreakdown } from '#/features/events/nap-breakdown';
import { SessionBreakdown } from '#/features/events/session-breakdown';
import { SleepDetailsEditor } from '#/features/events/sleep-details-editor';
import { useSessionAction, useTrackingSettings } from '#/lib/use-events';
import { useNow } from '#/lib/use-now';

export const Route = createFileRoute('/_app/sessions/$eventId')({ component: SessionPage });

function SessionPage() {
  const { babble, baby, family } = Route.useRouteContext();
  const { eventId } = Route.useParams();
  const running = useQuery(runningEventsQuery(babble.client, baby.id));
  const fallback = useQuery({ ...eventQuery(babble.client, baby.id, eventId), enabled: running.isSuccess });
  const now = useNow(1000);
  const navigate = useNavigate();
  const { mergeGapMs } = useTrackingSettings(babble.client, baby.id);
  const action = useSessionAction(babble.client, baby.id);
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
  if (event.deletedAt) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <StatusMessage tone="info">This session was discarded.</StatusMessage>
        <Link to="/" className="font-semibold text-primary underline">
          Back to Home
        </Link>
      </div>
    );
  }
  if (event.endedAt !== null) return <Navigate to="/events/$eventId" params={{ eventId }} replace />;

  const segments = event.type === 'breast_feed' || event.type === 'pump' ? event.segments : [];
  const trimTo = trimIdleSwitch(event, clock.now());

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
      <RunningCard
        event={event}
        client={babble.client}
        timeZone={baby.timezone}
        members={family.members}
        onDiscarded={() => void navigate({ to: '/' })}
      />
      {event.type !== 'sleep' && <KeepAwakeToggle />}
      {event.type === 'sleep' && (
        <section className="flex flex-col gap-2">
          <SectionLabel>Details</SectionLabel>
          <Card className="flex flex-col gap-3 p-5">
            <p className="text-meta text-ink-2">Saved as you go, without stopping the timer.</p>
            <SleepDetailsEditor event={event} client={babble.client} babyId={baby.id} />
          </Card>
        </section>
      )}
      {event.type === 'sleep' && event.segments.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionLabel>Session</SectionLabel>
          <NapBreakdown
            nap={event}
            now={now}
            onTrimAwake={
              trimTo ? () => action.mutate({ event, action: { kind: 'set-switch', at: trimTo } }) : undefined
            }
          />
        </section>
      )}
      {segments.length > 0 && (
        <section className="flex flex-col gap-2">
          <SectionLabel>Session</SectionLabel>
          <SessionBreakdown
            segments={segments}
            mergeGapMs={mergeGapMs}
            now={now}
            paused={!segments.some((segment) => segment.endedAt === null)}
            noun={event.type === 'pump' ? 'pumping' : 'feeding'}
            onTrimIdle={trimTo ? () => action.mutate({ event, action: { kind: 'set-switch', at: trimTo } }) : undefined}
          />
        </section>
      )}
    </div>
  );
}
