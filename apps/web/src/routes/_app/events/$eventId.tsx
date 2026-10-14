import {
  eventQuery,
  latestEventsQuery,
  runningEventsQuery,
  toBabbleError,
  type BabbleClient,
  authorName,
} from '@babble/api';
import { useAsyncAction, useResumeFeed, useTrackingSettings } from '@babble/api/react';
import {
  canResumeFeed,
  importedNote,
  eventToDraft,
  isSessionType,
  latestFeed,
  pumpFinishSummary,
  READ_ONLY_NOTE,
  trackerFor,
  type BabyEvent,
  type Units,
} from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Navigate, useNavigate, useRouter } from '@tanstack/react-router';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '#/components/shell/page-header';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { SectionSpinner } from '#/components/ui/spinner';
import { StatusMessage } from '#/components/ui/status';
import { TrackerIcon } from '#/components/ui/tracker-icon';
import { EntryAuthor } from '#/features/events/entry-author';
import { EventForm } from '#/features/events/event-form';
import { NapBreakdown } from '#/features/events/nap-breakdown';
import { SessionBreakdown } from '#/features/events/session-breakdown';
import { useNow } from '#/lib/use-now';

export const Route = createFileRoute('/_app/events/$eventId')({
  validateSearch: (search: Record<string, unknown>): { finish?: boolean } => ({
    finish: search.finish === true || search.finish === 'true' ? true : undefined,
  }),
  component: EditEvent,
});

function EditEvent() {
  const { babble, baby, family, canLog } = Route.useRouteContext();
  const { eventId } = Route.useParams();
  const { finish } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const { units, mergeGapMs } = useTrackingSettings(babble.client, baby.id);
  const latest = useQuery(latestEventsQuery(babble.client, baby.id)).data ?? [];
  const running = useQuery(runningEventsQuery(babble.client, baby.id)).data ?? [];
  const now = useNow(30_000);
  const resume = useResumeFeed(babble.client, baby.id);
  const resuming = useAsyncAction();
  const event = useQuery(eventQuery(babble.client, baby.id, eventId));

  if (event.isPending) return <SectionSpinner />;
  if (event.error || !event.data || event.data.deletedAt) {
    return (
      <StatusMessage tone="danger">
        {event.error ? toBabbleError(event.error).message : 'This entry was deleted.'}
      </StatusMessage>
    );
  }
  if (event.data.endedAt === null && isSessionType(event.data.type)) {
    return <Navigate to="/sessions/$eventId" params={{ eventId }} replace />;
  }

  const tracker = trackerFor(event.data.type);
  const note = importedNote(event.data);
  const finishSummary = finish ? pumpFinishSummary(event.data, baby.timezone) : null;
  const memberName = (userId: string | null) => authorName(family, userId);
  const done = () => {
    if (router.history.length > 1) router.history.back();
    else void navigate({ to: '/track/$type', params: { type: tracker.key } });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        backTo={{ to: '/track/$type', params: { type: tracker.key } }}
        icon={<TrackerIcon tracker={tracker} />}
        title={finish ? 'How much did you pump?' : tracker.label}
        subtitle={finishSummary}
      />
      {(event.data.type === 'breast_feed' || event.data.type === 'pump') && event.data.segments.length > 0 && (
        <SessionBreakdown
          segments={event.data.segments}
          mergeGapMs={event.data.source === 'manual' ? mergeGapMs : Number.POSITIVE_INFINITY}
          now={now}
          noun={event.data.type === 'pump' ? 'pumping' : 'feeding'}
        />
      )}
      {event.data.type === 'sleep' && event.data.segments.length > 0 && <NapBreakdown nap={event.data} now={now} />}
      {canLog && canResumeFeed(event.data, latestFeed(latest)?.id, running) && (
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            loading={resuming.busy}
            onClick={() =>
              resuming.run(async () => {
                await resume.mutateAsync(eventId);
                await navigate({ to: '/sessions/$eventId', params: { eventId } });
              })
            }
          >
            {!resuming.busy && <Play className="size-5" strokeWidth={2.75} />}
            Resume feed
          </Button>
          <p className="text-center text-meta text-ink-2">Resume only appears on the most recent feed.</p>
          {resuming.error && <StatusMessage tone="danger">{resuming.error}</StatusMessage>}
        </div>
      )}
      <EntryAuthor
        author={memberName(event.data.createdBy)}
        device={event.data.createdDevice}
        createdAt={event.data.createdAt}
        updatedAt={event.data.updatedAt}
        timeZone={baby.timezone}
        imported={event.data.source === 'huckleberry_csv'}
        timer={event.data.endRecordedAt !== null}
        ended={{
          endedBy: memberName(event.data.endedBy),
          endRecordedAt: event.data.endRecordedAt,
          startedAt: event.data.startedAt,
          timeZone: baby.timezone,
        }}
      />
      {note && <StatusMessage tone="info">{note}</StatusMessage>}
      {!canLog && <StatusMessage tone="info">{READ_ONLY_NOTE}</StatusMessage>}
      <EventFormPanel
        key={event.data.id}
        client={babble.client}
        babyId={baby.id}
        timeZone={baby.timezone}
        units={units}
        event={event.data}
        focusAmounts={finish}
        readOnly={!canLog}
        onDone={done}
      />
    </div>
  );
}

function EventFormPanel({
  client,
  babyId,
  timeZone,
  units,
  event,
  focusAmounts,
  readOnly,
  onDone,
}: {
  client: BabbleClient;
  babyId: string;
  timeZone: string;
  units: Units;
  event: BabyEvent;
  focusAmounts: boolean | undefined;
  readOnly: boolean;
  onDone: () => void;
}) {
  const [loaded, setLoaded] = useState({ updatedAt: event.updatedAt, version: 0 });
  const changedElsewhere = event.updatedAt !== loaded.updatedAt;
  return (
    <div className="flex flex-col gap-3">
      {changedElsewhere && (
        <StatusMessage tone="info">
          <span className="flex flex-wrap items-center justify-between gap-3">
            This entry was changed on another device.
            <Button
              variant="secondary"
              onClick={() => setLoaded((current) => ({ updatedAt: event.updatedAt, version: current.version + 1 }))}
            >
              Reload
            </Button>
          </span>
        </StatusMessage>
      )}
      <Card className="p-5">
        <EventForm
          key={loaded.version}
          client={client}
          babyId={babyId}
          timeZone={timeZone}
          units={units}
          event={event}
          initial={eventToDraft(event)}
          focusAmounts={focusAmounts}
          readOnly={readOnly}
          onDone={onDone}
        />
      </Card>
    </div>
  );
}
