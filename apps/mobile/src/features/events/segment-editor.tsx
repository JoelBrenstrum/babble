import {
  editableRowsToSegments,
  segmentsToEditableRows,
  type EditableRow,
  type Side,
  type TimedSegment,
} from '@babble/domain';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTokenColor } from '@/lib/theme';

function splitDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  return { minutes: Math.floor(totalSeconds / 60), seconds: totalSeconds % 60 };
}

function DurationInputs({ label, ms, onChange }: { label: string; ms: number; onChange: (ms: number) => void }) {
  const { minutes, seconds } = splitDuration(ms);
  const clamp = (value: string, max: number) => Math.min(max, Math.max(0, Number(value.replace(/\D/g, '')) || 0));
  return (
    <View className="flex-row items-center gap-1">
      <TextInput
        accessibilityLabel={`${label} minutes`}
        keyboardType="number-pad"
        className="h-10 w-14 rounded-tile border border-line-strong bg-raised px-2 text-right font-sans text-body text-ink"
        value={String(minutes)}
        onChangeText={(text) => onChange((clamp(text, 999) * 60 + seconds) * 1000)}
      />
      <Text className="font-sans text-meta text-ink-2">m</Text>
      <TextInput
        accessibilityLabel={`${label} seconds`}
        keyboardType="number-pad"
        className="h-10 w-12 rounded-tile border border-line-strong bg-raised px-2 text-right font-sans text-body text-ink"
        value={String(seconds).padStart(2, '0')}
        onChangeText={(text) => onChange((minutes * 60 + clamp(text, 59)) * 1000)}
      />
      <Text className="font-sans text-meta text-ink-2">s</Text>
    </View>
  );
}

export function SegmentEditor({
  startedAt,
  segments,
  onChange,
}: {
  startedAt: string;
  segments: readonly TimedSegment[];
  onChange: (next: { segments: TimedSegment[]; endedAt: string }) => void;
}) {
  const [rows, setRows] = useState<EditableRow[]>(() => segmentsToEditableRows(segments, new Date()));
  const trashColor = useTokenColor('--ink-3');

  function update(next: EditableRow[]) {
    setRows(next);
    onChange(editableRowsToSegments(startedAt, next));
  }

  const nextSide = (): Side => {
    const sides = rows.filter((row): row is Extract<EditableRow, { kind: 'side' }> => row.kind === 'side');
    return sides.at(-1)?.side === 'left' ? 'right' : 'left';
  };

  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">Session</Text>
      <View className="rounded-card border border-line">
        {rows.map((row, index) => (
          <View
            key={index}
            className={`flex-row items-center gap-2 px-3 py-2 ${index > 0 ? 'border-t border-line' : ''}`}
          >
            {row.kind === 'side' ? (
              <View accessibilityRole="radiogroup" className="flex-row gap-1">
                {(['left', 'right'] as const).map((side) => {
                  const selected = row.side === side;
                  const solid = side === 'left' ? 'bg-feed-left' : 'bg-feed-right';
                  return (
                    <Pressable
                      key={side}
                      accessibilityRole="radio"
                      accessibilityLabel={side === 'left' ? 'Left' : 'Right'}
                      accessibilityState={{ checked: selected }}
                      onPress={() => update(rows.map((r, i) => (i === index ? { ...row, side } : r)))}
                      className={`size-10 items-center justify-center rounded-full ${selected ? solid : 'border border-line bg-raised'}`}
                    >
                      <Text className={`font-bold text-label ${selected ? 'text-ink-on-solid' : 'text-ink-2'}`}>
                        {side === 'left' ? 'L' : 'R'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View className="w-[84px] flex-row items-center gap-2">
                <View className="size-3 rounded-full border-2 border-dashed border-session-downtime" />
                <Text className="font-sans text-body text-ink-2">Idle</Text>
              </View>
            )}
            <View className="flex-1" />
            <DurationInputs
              label={row.kind === 'side' ? `Segment ${index + 1}` : `Downtime ${index + 1}`}
              ms={row.durationMs}
              onChange={(durationMs) => update(rows.map((r, i) => (i === index ? { ...r, durationMs } : r)))}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${row.kind === 'side' ? 'segment' : 'downtime'} ${index + 1}`}
              onPress={() => update(rows.filter((_, i) => i !== index))}
              className="size-10 items-center justify-center rounded-full active:bg-danger-soft"
            >
              <Trash2 size={16} color={trashColor} strokeWidth={2.5} />
            </Pressable>
          </View>
        ))}
      </View>
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={() => update([...rows, { kind: 'side', side: nextSide(), durationMs: 5 * 60_000 }])}
          className="h-10 justify-center rounded-chip border border-line bg-raised px-3"
        >
          <Text className="font-semibold text-label text-ink">+ Add side</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => update([...rows, { kind: 'downtime', durationMs: 60_000 }])}
          className="h-10 justify-center rounded-chip border border-line bg-raised px-3"
        >
          <Text className="font-semibold text-label text-ink">+ Add downtime</Text>
        </Pressable>
      </View>
      <Text className="font-sans text-meta text-ink-2">Times are recalculated in order from the start time.</Text>
    </View>
  );
}
