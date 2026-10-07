import { runningEventsQuery } from '@babble/api';
import { emptyDraft, type EventDraft, type Side } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router';
import { ChevronLeft, Moon, Play } from 'lucide-react';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { StatusMessage } from '#/components/ui/status';
import { TrackerIcon } from '#/components/ui/tracker-icon';
import { EventForm } from '#/features/events/event-form';
import { isEventType, isSessionType, trackerFor, type SessionType } from '@babble/domain';
import { useStartSession, useUnits } from '#/lib/use-events';
import { toBabbleError } from '@babble/api';

export const Route = createFileRoute('/_app/track/$type/new')({
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
  const navigate = useNavigate();
  const units = useUnits(babble.client, baby.id);
  const tracker = trackerFor(eventType);
  const [logPast, setLogPast] = useState(!isSessionType(eventType));
  const back = () => void navigate({ to: '/track/$type', params: { type: eventType } });

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
            initial={pastDraft(eventType, new Date())}
            onDone={back}
          />
        </Card>
      )}
    </div>
  );
}

function StartSession({ type, onLogPast }: { type: SessionType; onLogPast: () => void }) {
  const { babble, baby } = Route.useRouteContext();
  const navigate = useNavigate();
  const start = useStartSession(babble.client, baby.id);
  const running = useQuery(runningEventsQuery(babble.client, baby.id)).data?.find((event) => event.type === type);
  const [error, setError] = useState<string | null>(null);

  function begin(side?: Side) {
    setError(null);
    start.mutate(
      { type, side },
      {
        onSuccess: (eventId) => void navigate({ to: '/sessions/$eventId', params: { eventId } }),
        onError: (caught) => setError(toBabbleError(caught).message),
      },
    );
  }

  if (running) {
    return (
      <Card className="flex flex-col gap-4 p-5">
        <p className="text-body">
          A {type === 'sleep' ? 'sleep' : type === 'pump' ? 'pump' : 'feed'} is already running.
        </p>
        <Link to="/sessions/$eventId" params={{ eventId: running.id }}>
          <Button size="lg" className="w-full">
            Open timer
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
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
                  ? 'flex h-36 flex-col items-center justify-center gap-2 rounded-card bg-feed-left text-ink-on-solid disabled:opacity-60'
                  : 'flex h-36 flex-col items-center justify-center gap-2 rounded-card bg-feed-right text-ink-on-solid disabled:opacity-60'
              }
            >
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
        Log a past {type === 'sleep' ? 'sleep' : type === 'pump' ? 'pump' : 'feed'} instead
      </Button>
    </div>
  );
}
