import { clock } from '@babble/api';
import {
  EARLIER_END_OPTIONS_MIN,
  earlierEnd,
  endChangeError,
  formatTimeOfDay,
  sessionNoun,
  suggestedEnd,
  type BabyEvent,
} from '@babble/domain';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { DateTimeField } from '@/components/datetime-field';

export function EndTimeButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-tap items-center justify-center self-center"
    >
      <Text className="font-sans text-meta text-ink-2">Ended earlier?</Text>
    </Pressable>
  );
}

export function EndTimeEditor({
  event,
  timeZone,
  onEnd,
  onCancel,
}: {
  event: BabyEvent;
  timeZone: string;
  onEnd: (endedAt: string) => void;
  onCancel: () => void;
}) {
  const now = clock.now();
  const [value, setValue] = useState(() => suggestedEnd(event, now));
  const error = endChangeError(event, value, now);

  return (
    <View accessibilityLabel="End earlier" className="gap-3 rounded-tile bg-raised p-4">
      <Text className="font-semibold text-body text-ink">Ended earlier?</Text>
      <View className="flex-row flex-wrap gap-2">
        {EARLIER_END_OPTIONS_MIN.map((minutes) => {
          const at = earlierEnd(now, minutes);
          const disabled = endChangeError(event, at, now) !== null;
          return (
            <Pressable
              key={minutes}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => onEnd(at)}
              className={`h-11 justify-center rounded-chip border border-line bg-raised px-4 ${disabled ? 'opacity-45' : ''}`}
            >
              <Text className="font-sans text-label text-ink">{`${minutes} min ago`}</Text>
            </Pressable>
          );
        })}
      </View>
      <DateTimeField
        label="End time"
        value={value}
        onChange={setValue}
        timeZone={timeZone}
        error={error ?? undefined}
      />
      <View className="flex-row gap-3">
        <Button variant="secondary" className="flex-1" onPress={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" disabled={error !== null} onPress={() => onEnd(value)}>
          {`End ${sessionNoun(event.type)} at ${formatTimeOfDay(value, timeZone)}`}
        </Button>
      </View>
    </View>
  );
}
