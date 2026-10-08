import { eventQuery, latestEventsQuery, resumeFeed, runningEventsQuery } from '@babble/api';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, Navigate, useNavigate, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { Card } from '#/components/ui/card';
import { Spinner } from '#/components/ui/spinner';
import { StatusMessage } from '#/components/ui/status';
import { TrackerIcon } from '#/components/ui/tracker-icon';
import { EntryAuthor } from '#/features/events/entry-author';
import { EventForm, toDraft } from '#/features/events/event-form';
import { canResumeFeed, importedNote, isSessionType, latestFeed, trackerFor } from '@babble/domain';
import { useTrackingSettings } from '#/lib/use-events';
import { SessionBreakdown } from '#/features/events/session-breakdown';
import { Button } from '#/components/ui/button';
import { useNow } from '#/lib/use-now';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { queryKeys } from '@babble/api';
import { useQueryClient } from '@tanstack/react-query';
import { toBabbleError } from '@babble/api';

export const Route = createFileRoute('/_app/events/$eventId')({
  validateSearch: (search: Record<string, unknown>): { finish?: boolean } => ({
    finish: search.finish === true || search.finish === 'true' ? true : undefined,
  }),
  component: EditEvent,
});

function EditEvent() {
  const { babble, baby, family } = Route.useRouteContext();
  const { eventId } = Route.useParams();
  const { finish } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const { units, mergeGapMs } = useTrackingSettings(babble.client, baby.id);
  const latest = useQuery(latestEventsQuery(babble.client, baby.id)).data ?? [];
  const running = useQuery(runningEventsQuery(babble.client, baby.id)).data ?? [];
  const queryClient = useQueryClient();
  const now = useNow(30_000);
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const event = useQuery(eventQuery(babble.client, baby.id, eventId));

  if (event.isPending) {
    return (
      <div className="flex justify-center py-16 text-primary">
        <Spinner className="size-7" />
      </div>
    );
  }
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
  const memberName = (userId: string | null) =>
    family.members.find((member) => member.user_id === userId)?.display_name;
  const done = () => {
    if (router.history.length > 1) router.history.back();
    else void navigate({ to: '/track/$type', params: { type: tracker.key } });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/track/$type"
          params={{ type: tracker.key }}
          aria-label="Back"
          className="grid size-tap place-items-center rounded-full hover:bg-surface"
        >
          <ChevronLeft className="size-6" strokeWidth={2.75} />
        </Link>
        <TrackerIcon tracker={tracker} />
        <h1 className="text-title font-bold">{finish ? 'How much did you pump?' : tracker.label}</h1>
      </div>
      {(event.data.type === 'breast_feed' || event.data.type === 'pump') && event.data.segments.length > 0 && (
        <SessionBreakdown
          segments={event.data.segments}
          mergeGapMs={event.data.source === 'manual' ? mergeGapMs : Number.POSITIVE_INFINITY}
          now={now}
          noun={event.data.type === 'pump' ? 'pumping' : 'feeding'}
        />
      )}
      {canResumeFeed(event.data, latestFeed(latest)?.id, running) && (
        <div className="flex flex-col gap-2">
          <Button
            size="lg"
            loading={resuming}
            onClick={async () => {
              setResuming(true);
              setResumeError(null);
              try {
                await resumeFeed(babble.client, eventId);
                await queryClient.invalidateQueries({ queryKey: queryKeys.events(baby.id), refetchType: 'all' });
                await navigate({ to: '/sessions/$eventId', params: { eventId } });
              } catch (caught) {
                setResumeError(toBabbleError(caught).message);
                setResuming(false);
              }
            }}
          >
            {!resuming && <Play className="size-5" strokeWidth={2.75} />}
            Resume feed
          </Button>
          <p className="text-center text-meta text-ink-2">Resume only appears on the most recent feed.</p>
          {resumeError && <StatusMessage tone="danger">{resumeError}</StatusMessage>}
        </div>
      )}
      <EntryAuthor
        author={memberName(event.data.createdBy)}
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
      <Card className="p-5">
        <EventForm
          key={event.data.updatedAt}
          client={babble.client}
          babyId={baby.id}
          timeZone={baby.timezone}
          units={units}
          event={event.data}
          initial={toDraft(event.data)}
          focusAmounts={finish}
          onDone={done}
        />
      </Card>
    </div>
  );
}
