import { formatDuration, napRows, type NapLike } from '@babble/domain';
import { Minus, Trash2 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Card } from '@/components/card';
import { useTokenColor } from '@/lib/theme';

export function NapBreakdown({
  nap,
  now,
  trim = 'last',
  onTrimAwake,
  onRemoveAwake,
}: {
  nap: NapLike;
  now: Date;
  trim?: 'last' | 'all';
  onTrimAwake?: (awakeIndex: number) => void;
  onRemoveAwake?: (awakeIndex: number) => void;
}) {
  const ink = useTokenColor('--ink');
  const muted = useTokenColor('--ink-2');
  const rows = napRows(nap, now);
  const lastAwake = rows.at(-1)?.kind === 'asleep' ? rows.length - 2 : -1;
  const asleepMs = rows.filter((row) => row.kind === 'asleep').reduce((sum, row) => sum + row.durationMs, 0);
  const awakeMs = rows.filter((row) => row.kind === 'awake').reduce((sum, row) => sum + row.durationMs, 0);
  let awakeIndex = -1;

  return (
    <Card>
      {rows.map((row, index) => {
        if (row.kind === 'awake') awakeIndex += 1;
        const current = awakeIndex;
        const canTrim = row.kind === 'awake' && !row.running && (trim === 'all' || index === lastAwake);
        return (
          <View
            key={index}
            className={`min-h-tap flex-row items-center gap-3 px-4 py-2 ${index > 0 ? 'border-t border-line' : ''}`}
          >
            {row.kind === 'asleep' ? (
              <View className="size-3 rounded-full bg-sleep" />
            ) : (
              <View className="size-3 rounded-full border-2 border-dashed border-session-downtime" />
            )}
            <Text
              className={`flex-1 text-body ${row.kind === 'asleep' ? 'font-semibold text-ink' : 'font-sans text-ink-2'}`}
            >
              {row.kind === 'asleep' ? 'Asleep' : 'Awake'}
            </Text>
            {row.running && (
              <Text
                className={`font-semibold text-meta ${row.kind === 'asleep' ? 'text-on-sleep' : 'text-on-session-downtime'}`}
              >
                {row.kind === 'asleep' ? 'sleeping' : 'awake · counting'}
              </Text>
            )}
            <Text className="w-20 text-right font-sans text-body text-ink">{formatDuration(row.durationMs)}</Text>
            {canTrim && onTrimAwake && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Take a minute off wake-up ${current + 1}`}
                onPress={() => onTrimAwake(current)}
                className="size-10 items-center justify-center rounded-full border border-line bg-raised"
              >
                <Minus color={ink} size={16} strokeWidth={3} />
              </Pressable>
            )}
            {row.kind === 'awake' && !row.running && onRemoveAwake && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove wake-up ${current + 1}`}
                onPress={() => onRemoveAwake(current)}
                className="size-10 items-center justify-center rounded-full"
              >
                <Trash2 color={muted} size={16} strokeWidth={2.5} />
              </Pressable>
            )}
          </View>
        );
      })}
      <View className="flex-row items-baseline justify-between border-t border-line px-4 py-3">
        <Text className="font-sans text-meta text-ink-2">
          {'Total asleep '}
          <Text className="font-semibold text-body text-ink">{formatDuration(asleepMs)}</Text>
        </Text>
        {awakeMs > 0 && <Text className="font-sans text-meta text-ink-2">{`awake ${formatDuration(awakeMs)}`}</Text>}
      </View>
    </Card>
  );
}
