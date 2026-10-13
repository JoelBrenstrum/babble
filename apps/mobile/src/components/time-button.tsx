import { clock } from '@babble/api';
import { dateToMinutes, minutesToClock, minutesToDate } from '@babble/domain';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

export function TimeButton({
  label,
  minutes,
  onChange,
  className = '',
}: {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
  className?: string;
}) {
  const [picking, setPicking] = useState(false);
  return (
    <View className={className}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setPicking((current) => !current)}
        className="min-h-tap justify-center rounded-button border border-line-strong bg-raised px-4"
      >
        <Text className="font-semibold text-body text-ink">{minutesToClock(minutes)}</Text>
      </Pressable>
      {picking && (
        <DateTimePicker
          value={minutesToDate(minutes, clock.now())}
          mode="time"
          minuteInterval={15}
          display="spinner"
          onChange={(event, date) => {
            if (Platform.OS === 'android' || event.type !== 'set') setPicking(false);
            if (event.type === 'set' && date) onChange(dateToMinutes(date));
          }}
        />
      )}
    </View>
  );
}
