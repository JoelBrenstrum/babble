import { clock, latestEventsQuery, runningEventsQuery, toBabbleError } from '@babble/api';
import {
  emptyDraft,
  feedPromptOnNapStart,
  napPromptOnFeedEnd,
  napPromptOnFeedStart,
  nextBreastSide,
  isEventType,
  isSessionType,
  trackerFor,
  type EventDraft,
  type SessionType,
  type Side,
  type TrackerKey,
} from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { StatusMessage } from '@/components/status-message';
import { TrackerIcon } from '@/components/tracker-icon';
import { EventForm } from '@/features/events/event-form';
import { useNapPrompt } from '@/features/nap-prompt';
import { useBabble } from '@/lib/babble';
import { useTokenColor } from '@/lib/theme';
import { useStartSession, useUnits } from '@/lib/use-events';
import { useReadyState } from '@/lib/use-onboarding';

function pastDraft(type: EventDraft['type'], now: Date): EventDraft {
  const draft = emptyDraft(type, now);
  const earlier = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();
  if (type === 'sleep') return { ...draft, startedAt: earlier(60) };
  if (type === 'breast_feed' || type === 'pump') return { ...draft, startedAt: earlier(20), endedAt: earlier(20) };
  return draft;
}

export default function NewEntry() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const ready = useReadyState();
  if (!type || !isEventType(type)) return <Redirect href="/" />;
  if (!ready) return null;
  return <NewEntryContent eventType={type} baby={ready.baby} />;
}

function NewEntryContent({
  eventType,
  baby,
}: {
  eventType: TrackerKey;
  baby: NonNullable<ReturnType<typeof useReadyState>>['baby'];
}) {
  const { client } = useBabble();
  const units = useUnits(client, baby.id);
  const tracker = trackerFor(eventType);
  const [logPast, setLogPast] = useState(!isSessionType(eventType));
  const showNapPrompt = useNapPrompt();
  const runningEvents = useQuery(runningEventsQuery(client, baby.id)).data ?? [];

  return (
    <Screen>
      <ScreenHeader
        title={logPast ? `Log ${tracker.label.toLowerCase()}` : tracker.label}
        icon={<TrackerIcon tracker={tracker} />}
      />
      {isSessionType(eventType) && !logPast && (
        <StartSession type={eventType} babyId={baby.id} onLogPast={() => setLogPast(true)} />
      )}
      {logPast && (
        <Card className="p-5">
          <EventForm
            client={client}
            babyId={baby.id}
            timeZone={baby.timezone}
            units={units}
            initial={pastDraft(eventType, clock.now())}
            onSaved={(draft) => {
              if (draft.type !== 'bottle') return;
              showNapPrompt(
                napPromptOnFeedStart(runningEvents, draft.startedAt) ??
                  napPromptOnFeedEnd(runningEvents, draft.endedAt ?? draft.startedAt),
              );
            }}
            onDone={() => router.back()}
          />
        </Card>
      )}
    </Screen>
  );
}

function StartSession({ type, babyId, onLogPast }: { type: SessionType; babyId: string; onLogPast: () => void }) {
  const { client } = useBabble();
  const start = useStartSession(client, babyId);
  const runningEvents = useQuery(runningEventsQuery(client, babyId)).data ?? [];
  const running = runningEvents.find((event) => event.type === type);
  const latest = useQuery(latestEventsQuery(client, babyId)).data ?? [];
  const suggested = type === 'breast_feed' ? nextBreastSide(latest) : null;
  const showNapPrompt = useNapPrompt();
  const [error, setError] = useState<string | null>(null);
  const spinnerColor = useTokenColor('--primary');
  const noun = type === 'sleep' ? 'sleep' : type === 'pump' ? 'pump' : 'feed';

  function begin(side?: Side) {
    setError(null);
    const startedAt = clock.now().toISOString();
    if (type === 'breast_feed') showNapPrompt(napPromptOnFeedStart(runningEvents, startedAt));
    if (type === 'sleep') showNapPrompt(feedPromptOnNapStart(runningEvents, startedAt));
    start.mutate(
      { type, side },
      {
        onSuccess: (eventId) => router.replace(`/sessions/${eventId}`),
        onError: (caught) => setError(toBabbleError(caught).message),
      },
    );
  }

  if (start.isPending || start.isSuccess) {
    return (
      <Card className="h-36 flex-row items-center justify-center gap-3">
        <ActivityIndicator color={spinnerColor} />
        <Text className="font-sans text-body text-ink-2">Starting…</Text>
      </Card>
    );
  }

  if (running) {
    return (
      <Card className="gap-4 p-5">
        <Text className="font-sans text-body text-ink">{`A ${noun} is already running.`}</Text>
        <Button size="lg" onPress={() => router.replace(`/sessions/${running.id}`)}>
          Open timer
        </Button>
      </Card>
    );
  }

  return (
    <View className="gap-4">
      {type === 'sleep' ? (
        <Button size="lg" loading={start.isPending} onPress={() => begin()}>
          Start sleep now
        </Button>
      ) : (
        <View className="flex-row gap-4">
          {(['left', 'right'] as const).map((side) => (
            <Pressable
              key={side}
              accessibilityRole="button"
              accessibilityLabel={side === suggested ? `Start ${side}, next side` : `Start ${side}`}
              disabled={start.isPending}
              onPress={() => begin(side)}
              className={`h-36 flex-1 items-center justify-center gap-2 rounded-card ${side === 'left' ? 'bg-feed-left' : 'bg-feed-right'}`}
            >
              {side === suggested && (
                <View className="absolute top-2.5 right-2.5 rounded-full bg-raised px-2.5 py-0.5">
                  <Text className="font-bold text-caption text-ink">Next</Text>
                </View>
              )}
              <Text className="font-bold text-timer-md text-ink-on-solid">{side === 'left' ? 'L' : 'R'}</Text>
              <Text className="font-semibold text-label text-ink-on-solid">{`Start ${side}`}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <Button variant="secondary" onPress={onLogPast}>
        {`Log a past ${noun} instead`}
      </Button>
    </View>
  );
}
