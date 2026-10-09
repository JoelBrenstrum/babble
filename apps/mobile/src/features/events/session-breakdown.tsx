import { formatDuration, summariseSegments, type TimedSegment } from '@babble/domain';
import { Minus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Card } from '@/components/card';
import { useTokenColor } from '@/lib/theme';

export function SessionBreakdown({
  segments,
  mergeGapMs,
  now,
  paused = false,
  noun = 'feeding',
  onTrimIdle,
}: {
  segments: readonly TimedSegment[];
  mergeGapMs: number;
  now: Date;
  paused?: boolean;
  noun?: 'feeding' | 'pumping';
  onTrimIdle?: () => void;
}) {
  const ink = useTokenColor('--ink');
  const lastEnd = segments.at(-1)?.endedAt ?? null;
  const summary = summariseSegments(segments, { mergeGapMs, now, pausedSince: paused ? lastEnd : null });
  if (summary.rows.length === 0) return null;
  const trimmableIndex = summary.rows.at(-1)?.kind === 'side' ? summary.rows.length - 2 : -1;

  return (
    <Card>
      {summary.rows.map((row, index) => (
        <View
          key={index}
          className={`min-h-tap flex-row items-center gap-3 px-4 py-2 ${index > 0 ? 'border-t border-line' : ''}`}
        >
          {row.kind === 'side' ? (
            <View className={`size-3 rounded-full ${row.side === 'left' ? 'bg-feed-left' : 'bg-feed-right'}`} />
          ) : (
            <View className="size-3 rounded-full border-2 border-dashed border-session-downtime" />
          )}
          <Text
            className={`flex-1 text-body ${row.kind === 'side' ? 'font-semibold text-ink' : 'font-sans text-ink-2'}`}
          >
            {row.kind === 'side' ? (row.side === 'left' ? 'Left' : 'Right') : 'Downtime'}
          </Text>
          {row.kind === 'downtime' && (
            <Text className="font-semibold text-meta text-on-session-downtime">
              {row.running ? 'idle · counting' : 'idle'}
            </Text>
          )}
          {row.running && row.kind === 'side' && (
            <Text
              className={`font-semibold text-meta ${row.side === 'left' ? 'text-on-feed-left' : 'text-on-feed-right'}`}
            >
              running
            </Text>
          )}
          <Text className="w-24 text-right font-sans text-body text-ink">{formatDuration(row.durationMs)}</Text>
          {onTrimIdle && row.kind === 'downtime' && index === trimmableIndex && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take a minute off the idle time"
              onPress={onTrimIdle}
              className="size-10 items-center justify-center rounded-full border border-line bg-raised"
            >
              <Minus color={ink} size={16} strokeWidth={3} />
            </Pressable>
          )}
        </View>
      ))}
      <View className="flex-row items-baseline justify-between border-t border-line px-4 py-3">
        <Text className="font-sans text-meta text-ink-2">
          {`Total ${noun} `}
          <Text className="font-semibold text-body text-ink">{formatDuration(summary.activeMs)}</Text>
        </Text>
        {summary.downtimeMs > 0 && (
          <Text className="font-sans text-meta text-ink-2">{`lost ${formatDuration(summary.downtimeMs)}`}</Text>
        )}
      </View>
    </Card>
  );
}
