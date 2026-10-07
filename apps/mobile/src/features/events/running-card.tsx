import type { BabbleClient, FamilyMemberRow } from '@babble/api';
import {
  discardNeedsConfirmation,
  formatDuration,
  formatTimeOfDay,
  formatTimer,
  napPromptOnFeedEnd,
  segmentTotals,
  sessionNoun,
  type BabyEvent,
  type Side,
} from '@babble/domain';
import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { Alert, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { useTokenColor } from '@/lib/theme';
import { queryKeys } from '@babble/api';
import { useQueryClient } from '@tanstack/react-query';
import { useNapPrompt } from '@/features/nap-prompt';
import { useDiscardSession, useSessionAction } from '@/lib/use-events';
import { useNow } from '@/lib/use-now';

const SIDE_LABEL: Record<Side, string> = { left: 'Left', right: 'Right' };

export function RunningCard({
  event,
  client,
  timeZone,
  members,
  compact = false,
  onDiscarded,
}: {
  event: BabyEvent;
  client: BabbleClient;
  timeZone: string;
  members: FamilyMemberRow[];
  compact?: boolean;
  onDiscarded?: () => void;
}) {
  const now = useNow(1000);
  const action = useSessionAction(client, event.babyId);
  const discard = useDiscardSession(client, event.babyId);
  const showNapPrompt = useNapPrompt();
  const queryClient = useQueryClient();
  const trashColor = useTokenColor('--ink-3');
  const noun = sessionNoun(event.type);

  function discardNow() {
    discard.mutate(event);
    onDiscarded?.();
  }

  function requestDiscard() {
    if (!discardNeedsConfirmation(event, new Date())) return discardNow();
    const elapsed = formatDuration(Date.now() - Date.parse(event.startedAt), { seconds: false });
    Alert.alert(`Discard this ${noun}?`, `It's been running for ${elapsed}. You can undo straight after.`, [
      { text: `Keep ${noun}`, style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: discardNow },
    ]);
  }
  const startedBy = members.find((member) => member.user_id === event.createdBy)?.display_name;

  const header = (title: string) => (
    <View className="flex-row items-center gap-3">
      <View className="size-3 rounded-full bg-session-active" />
      <Text className="flex-1 font-bold text-row-title text-ink">{title}</Text>
      {startedBy && <Avatar name={startedBy} />}
      {compact && (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(`/sessions/${event.id}`)}
          className="min-h-tap justify-center"
        >
          <Text className="font-semibold text-meta text-primary">Open</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Discard ${noun}`}
        onPress={requestDiscard}
        className="size-10 items-center justify-center rounded-full active:bg-danger-soft"
      >
        <Trash2 size={20} color={trashColor} strokeWidth={2.5} />
      </Pressable>
    </View>
  );

  if (event.type === 'sleep') {
    return (
      <View className="gap-3 rounded-card bg-sleep-soft p-5">
        {header('Napping')}
        <Text className="font-medium text-timer-lg text-on-sleep">
          {formatTimer(now.getTime() - Date.parse(event.startedAt))}
        </Text>
        <Text className="font-sans text-meta text-ink-2">{`Since ${formatTimeOfDay(event.startedAt, timeZone)}`}</Text>
        <Button size="lg" loading={action.isPending} onPress={() => action.mutate({ event, action: { kind: 'end' } })}>
          End nap
        </Button>
      </View>
    );
  }

  if (event.type !== 'breast_feed' && event.type !== 'pump') return null;

  const totals = segmentTotals(event.segments, now);
  const paused = totals.openSide === null;
  const currentMs = totals.openSegmentStartedAt ? now.getTime() - Date.parse(totals.openSegmentStartedAt) : 0;
  const title = event.type === 'pump' ? 'Pumping' : 'Feeding';

  function finish() {
    const running = queryClient.getQueryData<BabyEvent[]>(queryKeys.runningEvents(event.babyId)) ?? [];
    const ended = action.mutateAsync({ event, action: { kind: 'end' } });
    if (event.type === 'breast_feed') showNapPrompt(napPromptOnFeedEnd(running, new Date().toISOString()));
    if (event.type === 'pump') {
      ended
        .then(() => router.push({ pathname: '/events/[id]', params: { id: event.id, finish: '1' } }))
        .catch(() => undefined);
    }
  }

  return (
    <View
      className={`gap-3 rounded-card border-2 bg-raised p-5 ${event.type === 'pump' ? 'border-pump/40' : 'border-feed-right/40'}`}
    >
      {header(paused ? `${title} · paused` : `${title} · ${SIDE_LABEL[totals.openSide!]}`)}
      <View className="flex-row items-baseline gap-3">
        <Text className="font-medium text-timer-lg text-ink">{formatTimer(paused ? totals.activeMs : currentMs)}</Text>
        <Text className="font-sans text-meta text-ink-2">
          {paused ? 'total so far' : `total ${formatDuration(totals.activeMs)}`}
        </Text>
      </View>
      <View className="flex-row gap-3">
        {(['left', 'right'] as const).map((side) => {
          const active = totals.openSide === side;
          const ms = side === 'left' ? totals.leftMs : totals.rightMs;
          const solid = side === 'left' ? 'bg-feed-left' : 'bg-feed-right';
          const soft =
            side === 'left'
              ? 'bg-feed-left-soft border border-feed-left/40'
              : 'bg-feed-right-soft border border-feed-right/40';
          const text = active ? 'text-ink-on-solid' : side === 'left' ? 'text-on-feed-left' : 'text-on-feed-right';
          return (
            <Pressable
              key={side}
              accessibilityRole="button"
              accessibilityLabel={`${SIDE_LABEL[side]}${active ? ', on' : ''}`}
              accessibilityState={{ selected: active }}
              onPress={() =>
                action.mutate({
                  event,
                  action: active ? { kind: 'pause' } : paused ? { kind: 'resume', side } : { kind: 'switch', side },
                })
              }
              className={`min-h-tap-lg flex-1 flex-row items-center gap-3 rounded-card px-4 py-3 ${active ? solid : soft}`}
            >
              <Text className={`font-bold text-row-title ${text}`}>{side === 'left' ? 'L' : 'R'}</Text>
              <View>
                <Text
                  className={`font-semibold text-label ${text}`}
                >{`${SIDE_LABEL[side]}${active ? ' · on' : ''}`}</Text>
                <Text className={`font-sans text-meta ${text}`}>{formatDuration(ms)}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row gap-3">
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onPress={() => action.mutate({ event, action: paused ? { kind: 'resume' } : { kind: 'pause' } })}
        >
          {paused ? 'Resume' : 'Pause'}
        </Button>
        <Button
          size="lg"
          className="flex-1"
          onPress={finish}
          loading={action.isPending && action.variables?.action.kind === 'end'}
        >
          Finish
        </Button>
      </View>
    </View>
  );
}
