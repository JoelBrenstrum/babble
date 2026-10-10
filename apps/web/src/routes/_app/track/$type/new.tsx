import { clock, latestEventsQuery, runningEventsQuery } from '@babble/api';
import {
  emptyDraft,
  feedPromptOnNapStart,
  napPromptOnFeedEnd,
  napPromptOnFeedStart,
  nappyPromptOnFeedStart,
  nextBreastSide,
  runningSessionLine,
  runningTone,
  startContext,
  type BabyEvent,
  type RunningTone,
  type EventDraft,
  type Side,
} from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound, useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowRight, ChevronLeft, Clock, Moon, Play, Sun } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { Spinner } from '#/components/ui/spinner';
import { StatusMessage } from '#/components/ui/status';
import { TrackerIcon } from '#/components/ui/tracker-icon';
import { EventForm } from '#/features/events/event-form';
import { useNapPrompt } from '#/features/nap-prompt';
import { isEventType, isSessionType, trackerFor, type SessionType } from '@babble/domain';
import { useStartSession, useUnits } from '#/lib/use-events';
import { useNow } from '#/lib/use-now';
import { cn } from '#/lib/cn';
import { toBabbleError } from '@babble/api';

export const Route = createFileRoute('/_app/track/$type/new')({
  validateSearch: (search: Record<string, unknown>): { then?: 'back' } => ({
    then: search.then === 'back' ? 'back' : undefined,
  }),
  beforeLoad: ({ params }) => {
    if (!isEventType(params.type)) throw notFound();
    return { eventType: params.type };
  },
  component: NewEntry,
});

function pastDraft(type: EventDraft['type'], now: Date): EventDraft {
  const draft = emptyDraft(type, now);
  if (type === 'sleep') return { ...draft, startedAt: new Date(now.getTime() - 60 * 60_000).toISOString() };
  if (type === 'breast_feed' || type === 'pump') {
    return {
      ...draft,
      startedAt: new Date(now.getTime() - 20 * 60_000).toISOString(),
      endedAt: new Date(now.getTime() - 20 * 60_000).toISOString(),
    };
  }
  return draft;
}

function NewEntry() {
  const { babble, baby, eventType } = Route.useRouteContext();
  const { then } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const units = useUnits(babble.client, baby.id);
  const tracker = trackerFor(eventType);
  const [logPast, setLogPast] = useState(!isSessionType(eventType));
  const showNapPrompt = useNapPrompt();
  const running = useQuery(runningEventsQuery(babble.client, baby.id)).data ?? [];
  const latest = useQuery(latestEventsQuery(babble.client, baby.id)).data ?? [];
  const back = () =>
    then === 'back' ? router.history.back() : void navigate({ to: '/track/$type', params: { type: eventType } });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          to="/track/$type"
          params={{ type: eventType }}
          aria-label="Back"
          className="grid size-tap place-items-center rounded-full hover:bg-surface"
        >
          <ChevronLeft className="size-6" strokeWidth={2.75} />
        </Link>
        <TrackerIcon tracker={tracker} />
        <h1 className="text-title font-bold">{logPast ? `Log ${tracker.label.toLowerCase()}` : tracker.label}</h1>
      </div>

      {isSessionType(eventType) && !logPast && <StartSession type={eventType} onLogPast={() => setLogPast(true)} />}

      {logPast && (
        <Card className="p-5">
          <EventForm
            client={babble.client}
            babyId={baby.id}
            timeZone={baby.timezone}
            units={units}
            initial={pastDraft(eventType, clock.now())}
            onSaved={(draft) => {
              if (draft.type !== 'bottle') return;
              showNapPrompt(
                napPromptOnFeedStart(running, draft.startedAt) ??
                  napPromptOnFeedEnd(running, draft.endedAt ?? draft.startedAt),
              );
              showNapPrompt(nappyPromptOnFeedStart(latest, draft.startedAt));
            }}
            onDone={back}
          />
        </Card>
      )}
    </div>
  );
}

function StartSession({ type, onLogPast }: { type: SessionType; onLogPast: () => void }) {
  const { babble, baby, family } = Route.useRouteContext();
  const units = useUnits(babble.client, baby.id);
  const now = useNow(1000);
  const navigate = useNavigate();
  const start = useStartSession(babble.client, baby.id);
  const runningEvents = useQuery(runningEventsQuery(babble.client, baby.id)).data ?? [];
  const running = runningEvents.find((event) => event.type === type);
  const latest = useQuery(latestEventsQuery(babble.client, baby.id)).data ?? [];
  const suggested = type === 'breast_feed' ? nextBreastSide(latest) : null;
  const showNapPrompt = useNapPrompt();
  const [error, setError] = useState<string | null>(null);
  const noun = type === 'sleep' ? 'sleep' : type === 'pump' ? 'pump' : 'feed';
  const context = startContext(type, latest, now, units);

  function begin(side?: Side) {
    setError(null);
    const startedAt = clock.now().toISOString();
    if (type === 'breast_feed') showNapPrompt(napPromptOnFeedStart(runningEvents, startedAt));
    if (type === 'sleep') showNapPrompt(feedPromptOnNapStart(runningEvents, startedAt));
    start.mutate(
      { type, side },
      {
        onSuccess: (eventId) => {
          void navigate({ to: '/sessions/$eventId', params: { eventId } });
          if (type === 'breast_feed') showNapPrompt(nappyPromptOnFeedStart(latest, startedAt));
        },
        onError: (caught) => setError(toBabbleError(caught).message),
      },
    );
  }

  if (start.isPending || start.isSuccess) {
    return (
      <div
        role="status"
        className="flex h-36 items-center justify-center gap-3 rounded-card bg-raised text-body text-ink-2 shadow-raised"
      >
        <Spinner className="size-6 text-primary" />
        Starting…
      </div>
    );
  }

  if (running) {
    const startedBy = family.members.find((member) => member.user_id === running.createdBy)?.display_name;
    return (
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <RunningDot event={running} />
          <div className="flex min-w-0 flex-col">
            <p className="text-row-title font-bold">A {noun} is already running.</p>
            <p className="tabular text-meta text-ink-2">{runningSessionLine(running, now, startedBy)}</p>
          </div>
        </div>
        <Link to="/sessions/$eventId" params={{ eventId: running.id }}>
          <Button size="lg" className="w-full">
            Open timer
            <ArrowRight className="size-5" strokeWidth={2.75} />
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {context && (
        <div className="flex items-center gap-3 rounded-tile bg-surface px-4 py-3">
          {type === 'sleep' ? (
            <Sun className="size-5 shrink-0 text-ink-2" strokeWidth={2.5} />
          ) : (
            <Clock className="size-5 shrink-0 text-ink-2" strokeWidth={2.5} />
          )}
          <span className="tabular text-body">{context}</span>
        </div>
      )}
      {type === 'sleep' ? (
        <Button
          size="lg"
          className="h-24 bg-sleep text-row-title text-ink-on-solid hover:bg-on-sleep"
          loading={start.isPending}
          onClick={() => begin()}
        >
          {!start.isPending && <Moon className="size-6" strokeWidth={2.75} />}
          Start sleep now
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {(['left', 'right'] as const).map((side) => (
            <button
              key={side}
              type="button"
              disabled={start.isPending}
              onClick={() => begin(side)}
              className={
                side === 'left'
                  ? 'relative flex h-36 flex-col items-center justify-center gap-2 rounded-card bg-feed-left text-ink-on-solid disabled:opacity-60'
                  : 'relative flex h-36 flex-col items-center justify-center gap-2 rounded-card bg-feed-right text-ink-on-solid disabled:opacity-60'
              }
            >
              {side === suggested && (
                <span className="absolute top-2.5 right-2.5 rounded-full bg-raised px-2.5 py-0.5 text-caption font-bold text-ink">
                  Next
                </span>
              )}
              <span className="text-timer-md font-bold">{side === 'left' ? 'L' : 'R'}</span>
              <span className="flex items-center gap-1 text-label font-semibold">
                <Play className="size-4" strokeWidth={3} />
                Start {side}
              </span>
            </button>
          ))}
        </div>
      )}
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <Button variant="secondary" onClick={onLogPast}>
        Log a past {noun} instead
      </Button>
    </div>
  );
}

const DOT_COLOUR: Record<RunningTone, string> = {
  downtime: 'bg-session-downtime',
  sleep: 'bg-sleep',
  pump: 'bg-pump',
  'feed-left': 'bg-feed-left',
  'feed-right': 'bg-feed-right',
};

function RunningDot({ event }: { event: BabyEvent }) {
  const tone = runningTone(event);
  return (
    <span className="relative mt-2 grid size-2.5 shrink-0 place-items-center">
      {tone !== 'downtime' && (
        <span data-pulse className={cn('absolute inset-0 animate-timer-pulse rounded-full', DOT_COLOUR[tone])} />
      )}
      <span className={cn('size-2.5 rounded-full', DOT_COLOUR[tone])} />
    </span>
  );
}
