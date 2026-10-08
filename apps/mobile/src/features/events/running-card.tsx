import type { BabbleClient, FamilyMemberRow } from '@babble/api';
import {
  discardNeedsConfirmation,
  formatDuration,
  formatTimer,
  feedEndTime,
  napPromptOnFeedEnd,
  pausedForMs,
  segmentTotals,
  sessionNoun,
  summariseSleep,
  type BabyEvent,
  type Side,
} from '@babble/domain';
import { router } from 'expo-router';
import { Moon, Pause, Play, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { useTokenColor } from '@/lib/theme';
import { clock, queryKeys } from '@babble/api';
import { useQueryClient } from '@tanstack/react-query';
import { useNapPrompt } from '@/features/nap-prompt';
import { useDiscardSession, useSessionAction } from '@/lib/use-events';
import { useNow } from '@/lib/use-now';
import { EndTimeButton, EndTimeEditor } from './end-time-editor';
import { StartTimeButton, StartTimeEditor } from './start-time-editor';

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
  const inkColor = useTokenColor('--ink');
  const onSolidColor = useTokenColor('--ink-on-solid');
  const noun = sessionNoun(event.type);
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd] = useState(false);

  function discardNow() {
    discard.mutate(event);
    onDiscarded?.();
  }

  function requestDiscard() {
    if (!discardNeedsConfirmation(event, clock.now())) return discardNow();
    const elapsed = formatDuration(clock.now().getTime() - Date.parse(event.startedAt), { seconds: false });
    Alert.alert(`Discard this ${noun}?`, `It's been running for ${elapsed}. You can undo straight after.`, [
      { text: `Keep ${noun}`, style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: discardNow },
    ]);
  }
  const startControls = editingStart ? (
    <StartTimeEditor
      event={event}
      timeZone={timeZone}
      onCancel={() => setEditingStart(false)}
      onSave={(startedAt) => {
        setEditingStart(false);
        action.mutate({ event, action: { kind: 'set-start', startedAt } });
      }}
    />
  ) : (
    <StartTimeButton event={event} timeZone={timeZone} onPress={() => setEditingStart(true)} />
  );
  const endControls = (end: (at?: string) => void) =>
    editingEnd ? (
      <EndTimeEditor
        event={event}
        timeZone={timeZone}
        onCancel={() => setEditingEnd(false)}
        onEnd={(at) => {
          setEditingEnd(false);
          end(at);
        }}
      />
    ) : (
      <EndTimeButton onPress={() => setEditingEnd(true)} />
    );
  const startedBy = members.find((member) => member.user_id === event.createdBy)?.display_name;

  const header = (title: string, paused: boolean) => (
    <View className="flex-row items-center gap-3">
      <View
        testID={paused ? 'session-dot-paused' : 'session-dot-running'}
        className={`size-3 rounded-full ${paused ? 'bg-session-downtime' : 'bg-session-active'}`}
      />
      <Text className="font-bold text-row-title text-ink">{title}</Text>
      <View className="min-w-0 flex-1 flex-row items-center justify-end gap-2">
        {startedBy && (
          <>
            <Avatar name={startedBy} />
            <Text numberOfLines={1} className="shrink font-sans text-meta text-ink-2">{`Started by ${startedBy}`}</Text>
          </>
        )}
      </View>
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
    const sleep = summariseSleep(event, now);
    return (
      <View className="gap-3 rounded-card bg-sleep-soft p-5">
        {header(sleep.paused ? 'Awake · nap paused' : 'Napping', sleep.paused)}
        <View className="flex-row flex-wrap items-baseline gap-x-3">
          <Text className={`font-medium text-timer-lg ${sleep.paused ? 'text-ink-2' : 'text-on-sleep'}`}>
            {formatTimer(sleep.asleepMs)}
          </Text>
          {sleep.wakeUps > 0 && (
            <Text className="font-sans text-meta text-ink-2">
              {`awake ${formatDuration(sleep.awakeMs)} · ${sleep.wakeUps === 1 ? '1 wake-up' : `${sleep.wakeUps} wake-ups`}`}
            </Text>
          )}
        </View>
        {startControls}
        <View className="flex-row gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            icon={
              sleep.paused ? (
                <Play size={20} color={inkColor} strokeWidth={2.75} />
              ) : (
                <Pause size={20} color={inkColor} strokeWidth={2.75} />
              )
            }
            onPress={() => action.mutate({ event, action: sleep.paused ? { kind: 'resume' } : { kind: 'pause' } })}
          >
            {sleep.paused ? 'Resume nap' : 'Pause nap'}
          </Button>
          <Button
            variant="sleep"
            size="lg"
            className="flex-1"
            icon={<Moon size={20} color={onSolidColor} strokeWidth={2.75} />}
            loading={action.isPending && action.variables?.action.kind === 'end'}
            onPress={() => action.mutate({ event, action: { kind: 'end' } })}
          >
            End nap
          </Button>
        </View>
        {endControls((at) => action.mutate({ event, action: { kind: 'end', at } }))}
      </View>
    );
  }

  if (event.type !== 'breast_feed' && event.type !== 'pump') return null;

  const totals = segmentTotals(event.segments, now);
  const paused = totals.openSide === null;
  const currentMs = totals.openSegmentStartedAt ? now.getTime() - Date.parse(totals.openSegmentStartedAt) : 0;
  const title = event.type === 'pump' ? 'Pumping' : 'Feeding';

  function finish(at?: string) {
    const running = queryClient.getQueryData<BabyEvent[]>(queryKeys.runningEvents(event.babyId)) ?? [];
    const ended = action.mutateAsync({ event, action: { kind: 'end', at } });
    if (event.type === 'breast_feed') {
      showNapPrompt(napPromptOnFeedEnd(running, at ?? feedEndTime(event, clock.now())));
    }
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
      {header(paused ? `${title} · paused` : `${title} · ${SIDE_LABEL[totals.openSide!]}`, paused)}
      <View className="flex-row items-baseline gap-3">
        <Text className={`font-medium text-timer-lg ${paused ? 'text-ink-2' : 'text-ink'}`}>
          {formatTimer(paused ? totals.activeMs : currentMs)}
        </Text>
        <Text className="font-sans text-meta text-ink-2">
          {paused
            ? `Paused for ${formatDuration(pausedForMs(event.segments, now) ?? 0)}`
            : `total ${formatDuration(totals.activeMs)}`}
        </Text>
      </View>
      {startControls}
      <View className="flex-row gap-3">
        {(['left', 'right'] as const).map((side) => {
          const active = totals.openSide === side;
          const ms = side === 'left' ? totals.leftMs : totals.rightMs;
          const solid = side === 'left' ? 'bg-feed-left' : 'bg-feed-right';
          const soft =
            side === 'left'
              ? 'bg-feed-left-soft border border-feed-left/40'
              : 'bg-feed-right-soft border border-feed-right/40';
          const state = active ? ' · on' : paused && side === totals.lastSide ? ' · last' : '';
          const text = active ? 'text-ink-on-solid' : side === 'left' ? 'text-on-feed-left' : 'text-on-feed-right';
          return (
            <Pressable
              key={side}
              accessibilityRole="button"
              accessibilityLabel={`${SIDE_LABEL[side]}${state.replace(' ·', ',')}`}
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
                <Text className={`font-semibold text-label ${text}`}>{`${SIDE_LABEL[side]}${state}`}</Text>
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
          onPress={() => finish()}
          loading={action.isPending && action.variables?.action.kind === 'end'}
        >
          Finish
        </Button>
      </View>
      {endControls(finish)}
    </View>
  );
}
