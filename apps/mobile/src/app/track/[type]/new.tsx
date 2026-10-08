import { clock, latestEventsQuery, runningEventsQuery, toBabbleError } from '@babble/api';
import {
  emptyDraft,
  feedPromptOnNapStart,
  napPromptOnFeedEnd,
  napPromptOnFeedStart,
  nextBreastSide,
  runningSessionLine,
  runningTone,
  startContext,
  isEventType,
  isSessionType,
  trackerFor,
  type EventDraft,
  type RunningTone,
  type SessionType,
  type Side,
  type TrackerKey,
} from '@babble/domain';
import type { FamilyMemberRow } from '@babble/api';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Moon, Sun } from 'lucide-react-native';
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
import { useNow } from '@/lib/use-now';
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
  return <NewEntryContent eventType={type} baby={ready.baby} members={ready.family.members} />;
}

function NewEntryContent({
  eventType,
  baby,
  members,
}: {
  eventType: TrackerKey;
  baby: NonNullable<ReturnType<typeof useReadyState>>['baby'];
  members: FamilyMemberRow[];
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
        <StartSession type={eventType} babyId={baby.id} members={members} onLogPast={() => setLogPast(true)} />
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

function StartSession({
  type,
  babyId,
  members,
  onLogPast,
}: {
  type: SessionType;
  babyId: string;
  members: FamilyMemberRow[];
  onLogPast: () => void;
}) {
  const { client } = useBabble();
  const units = useUnits(client, babyId);
  const now = useNow(1000);
  const onPrimary = useTokenColor('--on-primary');
  const onSolid = useTokenColor('--ink-on-solid');
  const ink2 = useTokenColor('--ink-2');
  const start = useStartSession(client, babyId);
  const runningEvents = useQuery(runningEventsQuery(client, babyId)).data ?? [];
  const running = runningEvents.find((event) => event.type === type);
  const latest = useQuery(latestEventsQuery(client, babyId)).data ?? [];
  const suggested = type === 'breast_feed' ? nextBreastSide(latest) : null;
  const showNapPrompt = useNapPrompt();
  const [error, setError] = useState<string | null>(null);
  const spinnerColor = useTokenColor('--primary');
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
    const startedBy = members.find((member) => member.user_id === running.createdBy)?.display_name;
    const tone = runningTone(running);
    return (
      <Card className="gap-4 p-5">
        <View className="flex-row items-start gap-3">
          <View testID={`running-dot-${tone}`} className={`mt-2 size-2.5 rounded-full ${DOT_COLOUR[tone]}`} />
          <View className="flex-1">
            <Text className="font-bold text-row-title text-ink">{`A ${noun} is already running.`}</Text>
            <Text className="font-sans text-meta text-ink-2">{runningSessionLine(running, now, startedBy)}</Text>
          </View>
        </View>
        <Button
          size="lg"
          icon={<ArrowRight size={20} color={onPrimary} strokeWidth={2.75} />}
          onPress={() => router.replace(`/sessions/${running.id}`)}
        >
          Open timer
        </Button>
      </Card>
    );
  }

  return (
    <View className="gap-4">
      {context && (
        <View className="flex-row items-center gap-3 rounded-tile bg-surface px-4 py-3">
          {type === 'sleep' ? (
            <Sun size={20} color={ink2} strokeWidth={2.5} />
          ) : (
            <Clock size={20} color={ink2} strokeWidth={2.5} />
          )}
          <Text className="flex-1 font-sans text-body text-ink">{context}</Text>
        </View>
      )}
      {type === 'sleep' ? (
        <Button
          variant="sleep"
          size="lg"
          className="h-24"
          loading={start.isPending}
          icon={<Moon size={24} color={onSolid} strokeWidth={2.75} />}
          onPress={() => begin()}
        >
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

const DOT_COLOUR: Record<RunningTone, string> = {
  downtime: 'bg-session-downtime',
  sleep: 'bg-sleep',
  pump: 'bg-pump',
  'feed-left': 'bg-feed-left',
  'feed-right': 'bg-feed-right',
};
