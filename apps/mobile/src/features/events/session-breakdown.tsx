import { formatDuration, summariseSegments, type TimedSegment } from '@babble/domain';
import { Text, View } from 'react-native';
import { Card } from '@/components/card';

export function SessionBreakdown({
  segments,
  mergeGapMs,
  now,
  paused = false,
  noun = 'feeding',
}: {
  segments: readonly TimedSegment[];
  mergeGapMs: number;
  now: Date;
  paused?: boolean;
  noun?: 'feeding' | 'pumping';
}) {
  const lastEnd = segments.at(-1)?.endedAt ?? null;
  const summary = summariseSegments(segments, { mergeGapMs, now, pausedSince: paused ? lastEnd : null });
  if (summary.rows.length === 0) return null;

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
