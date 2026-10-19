import { formatDuration, formatTimer, summariseSleep, type BabyEvent } from '@babble/domain';
import { Moon, Pause, Play } from 'lucide-react-native';
import { View, Text } from 'react-native';
import { Button } from '@/components/button';
import { useTokenColor } from '@/lib/theme';
import { useRunningCardShell, type RunningCardProps } from './running-card-shell';
import { useNow } from '@babble/api/react';

export function SleepRunningCard(props: RunningCardProps & { event: Extract<BabyEvent, { type: 'sleep' }> }) {
  const { event } = props;
  const now = useNow(1000);
  const { action, header, startControls, endControls } = useRunningCardShell(props);
  const inkColor = useTokenColor('--ink');
  const onSolidColor = useTokenColor('--ink-on-solid');
  const sleep = summariseSleep(event, now);
  const PauseIcon = sleep.paused ? Play : Pause;

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
          icon={<PauseIcon size={20} color={inkColor} strokeWidth={2.75} />}
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
