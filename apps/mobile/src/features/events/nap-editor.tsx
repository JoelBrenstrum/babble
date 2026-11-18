import {
  addWakeUpRow,
  clampDurationPart,
  editRowsToNap,
  editRowTotals,
  formatDuration,
  joinHoursMinutes,
  napToEditRows,
  removeWakeUpRow,
  splitHoursMinutes,
  type DraftOfType,
  type NapEditRow,
} from '@babble/domain';
import { Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTokenColor } from '@/lib/theme';

function HoursMinutesInputs({ label, ms, onChange }: { label: string; ms: number; onChange: (ms: number) => void }) {
  const { hours, minutes } = splitHoursMinutes(ms);
  return (
    <View className="flex-row items-center gap-1">
      <TextInput
        accessibilityLabel={`${label} hours`}
        keyboardType="number-pad"
        className="h-10 w-12 rounded-tile border border-line-strong bg-raised px-2 text-right font-sans text-body text-ink"
        value={String(hours)}
        onChangeText={(text) => onChange(joinHoursMinutes(clampDurationPart(text, 23), minutes))}
      />
      <Text className="font-sans text-meta text-ink-2">h</Text>
      <TextInput
        accessibilityLabel={`${label} minutes`}
        keyboardType="number-pad"
        className="h-10 w-12 rounded-tile border border-line-strong bg-raised px-2 text-right font-sans text-body text-ink"
        value={String(minutes).padStart(2, '0')}
        onChangeText={(text) => onChange(joinHoursMinutes(hours, clampDurationPart(text, 59)))}
      />
      <Text className="font-sans text-meta text-ink-2">m</Text>
    </View>
  );
}

export function NapEditor({
  startedAt,
  endedAt,
  segments,
  onChange,
}: {
  startedAt: string;
  endedAt: string;
  segments: DraftOfType<'sleep'>['segments'];
  onChange: (next: ReturnType<typeof editRowsToNap>) => void;
}) {
  const [rows, setRows] = useState<NapEditRow[]>(() => napToEditRows(startedAt, endedAt, segments));
  const { asleepMs, awakeMs } = editRowTotals(rows);
  const trashColor = useTokenColor('--ink-3');
  const ink = useTokenColor('--ink');

  function update(next: NapEditRow[]) {
    setRows(next);
    onChange(editRowsToNap(startedAt, next));
  }

  let wakeUp = 0;
  let stretch = 0;

  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">Sleep and wake-ups</Text>
      <View className="rounded-card border border-line">
        {rows.map((row, index) => {
          const number = row.kind === 'awake' ? ++wakeUp : ++stretch;
          return (
            <View key={index} className="min-h-tap flex-row items-center gap-2 border-b border-line px-3 py-2">
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
              <HoursMinutesInputs
                label={row.kind === 'awake' ? `Wake-up ${number}` : `Sleep ${number}`}
                ms={row.durationMs}
                onChange={(durationMs) => update(rows.map((r, i) => (i === index ? { ...r, durationMs } : r)))}
              />
              {row.kind === 'awake' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove wake-up ${number}`}
                  onPress={() => update(removeWakeUpRow(rows, index))}
                  className="size-10 items-center justify-center rounded-full active:bg-danger-soft"
                >
                  <Trash2 size={16} color={trashColor} strokeWidth={2.5} />
                </Pressable>
              ) : (
                <View className="size-10" />
              )}
            </View>
          );
        })}
        <View className="flex-row items-baseline justify-between px-4 py-3">
          <Text className="font-sans text-meta text-ink-2">
            Total asleep{' '}
            <Text className="font-semibold text-body text-ink">{formatDuration(asleepMs, { seconds: false })}</Text>
          </Text>
          {awakeMs > 0 && (
            <Text className="font-sans text-meta text-ink-2">awake {formatDuration(awakeMs, { seconds: false })}</Text>
          )}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={asleepMs <= 0}
        onPress={() => update(addWakeUpRow(rows))}
        className={`h-10 flex-row items-center gap-1 self-start rounded-chip border border-line bg-raised px-3 ${asleepMs <= 0 ? 'opacity-50' : ''}`}
      >
        <Plus color={ink} size={16} strokeWidth={3} />
        <Text className="font-semibold text-label text-ink">Add a wake-up</Text>
      </Pressable>
      <Text className="font-sans text-meta text-ink-2">
        Times are recalculated in order from when they fell asleep.
      </Text>
    </View>
  );
}
