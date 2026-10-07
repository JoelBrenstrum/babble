import { clock } from '@babble/api';
import {
  EARLIER_START_OPTIONS_MIN,
  earlierStart,
  formatTimeOfDay,
  startChangeError,
  type BabyEvent,
} from '@babble/domain';
import { Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { DateTimeField } from '@/components/datetime-field';
import { useTokenColor } from '@/lib/theme';

export function StartTimeButton({
  event,
  timeZone,
  onPress,
}: {
  event: BabyEvent;
  timeZone: string;
  onPress: () => void;
}) {
  const color = useTokenColor('--ink-2');
  const time = formatTimeOfDay(event.startedAt, timeZone);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Change start time, started ${time}`}
      onPress={onPress}
      className="min-h-tap flex-row items-center gap-1.5 self-start"
    >
      <Text className="font-sans text-meta text-ink-2">{`Started ${time}`}</Text>
      <Pencil size={14} color={color} strokeWidth={2.5} />
    </Pressable>
  );
}

export function StartTimeEditor({
  event,
  timeZone,
  onSave,
  onCancel,
}: {
  event: BabyEvent;
  timeZone: string;
  onSave: (startedAt: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(event.startedAt);
  const error = value === event.startedAt ? null : startChangeError(event, value, clock.now());

  return (
    <View accessibilityLabel="Change start time" className="gap-3 rounded-tile bg-raised p-4">
      <Text className="font-semibold text-body text-ink">Started earlier?</Text>
      <View className="flex-row flex-wrap gap-2">
        {EARLIER_START_OPTIONS_MIN.map((minutes) => (
          <Pressable
            key={minutes}
            accessibilityRole="button"
            onPress={() => onSave(earlierStart(event, minutes))}
            className="h-11 justify-center rounded-chip border border-line bg-raised px-4"
          >
            <Text className="font-sans text-label text-ink">{`${minutes} min earlier`}</Text>
          </Pressable>
        ))}
      </View>
      <DateTimeField
        label="Start time"
        value={value}
        onChange={setValue}
        timeZone={timeZone}
        error={error ?? undefined}
      />
      <View className="flex-row gap-3">
        <Button variant="secondary" className="flex-1" onPress={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" disabled={value === event.startedAt || error !== null} onPress={() => onSave(value)}>
          Save start
        </Button>
      </View>
    </View>
  );
}
