import {
  feedEndTime,
  formatDuration,
  formatTimer,
  pausedForMs,
  segmentTotals,
  SIDE_LABEL,
  type BabyEvent,
  type Side,
} from '@babble/domain';
import { clock } from '@babble/api';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { useNapPrompt } from '@/features/nap-prompt';
import { SIDE_STYLE } from '@/lib/side-style';
import { useRunningCardShell, type RunningCardProps } from './running-card-shell';
import { useNow, useSessionPrompts } from '@babble/api/react';

type FeedEvent = Extract<BabyEvent, { type: 'breast_feed' | 'pump' }>;

export function FeedRunningCard(props: RunningCardProps & { event: FeedEvent }) {
  const { event, client } = props;
  const now = useNow(1000);
  const { action, header, startControls, endControls } = useRunningCardShell(props);
  const showPrompts = useNapPrompt();
  const promptsFor = useSessionPrompts(client, event.babyId);

  const totals = segmentTotals(event.segments, now);
  const open = totals.open;
  const paused = open === null;
  const currentMs = open ? now.getTime() - Date.parse(open.startedAt) : 0;
  const title = event.type === 'pump' ? 'Pumping' : 'Feeding';

  async function pressSide(side: Side, active: boolean) {
    const prompts = active ? [] : promptsFor({ kind: 'side', event, side });
    const ok = await action
      .mutateAsync({
        event,
        action: active ? { kind: 'pause' } : paused ? { kind: 'resume', side } : { kind: 'switch', side },
      })
      .then(
        () => true,
        () => false,
      );
    if (ok) showPrompts(prompts);
  }

  async function finish(at?: string) {
    const prompts = promptsFor({ kind: 'end', event, at: at ?? feedEndTime(event, clock.now()) });
    const ok = await action.mutateAsync({ event, action: { kind: 'end', at } }).then(
      () => true,
      () => false,
    );
    if (!ok) return;
    showPrompts(prompts);
    if (event.type === 'pump') router.push({ pathname: '/events/[id]', params: { id: event.id, finish: '1' } });
  }

  return (
    <View
      className={`gap-3 rounded-card border-2 bg-raised p-5 ${event.type === 'pump' ? 'border-pump/40' : 'border-feed-right/40'}`}
    >
      {header(open ? `${title} · ${SIDE_LABEL[open.side]}` : `${title} · paused`, paused)}
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
          const active = open?.side === side;
          const ms = side === 'left' ? totals.leftMs : totals.rightMs;
          const style = SIDE_STYLE[side];
          const state = active ? ' · on' : paused && side === totals.lastSide ? ' · last' : '';
          const text = active ? 'text-ink-on-solid' : style.text;
          return (
            <Pressable
              key={side}
              accessibilityRole="button"
              accessibilityLabel={`${SIDE_LABEL[side]}${state.replace(' ·', ',')}`}
              accessibilityState={{ selected: active }}
              onPress={() => void pressSide(side, active)}
              className={`min-h-tap-lg flex-1 flex-row items-center gap-3 rounded-card px-4 py-3 ${active ? style.solid : style.soft}`}
            >
              <Text className={`font-bold text-row-title ${text}`}>{style.letter}</Text>
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
          onPress={() => void finish()}
          loading={action.isPending && action.variables?.action.kind === 'end'}
        >
          Finish
        </Button>
      </View>
      {endControls(finish)}
    </View>
  );
}
