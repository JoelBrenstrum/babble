import { minutesToClock } from '@babble/domain';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

export function DayStartPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  const custom = value !== 0;
  const [picking, setPicking] = useState(false);

  function handle(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setPicking(false);
    if (event.type !== 'set' || !date) return;
    const minutes = date.getHours() * 60 + date.getMinutes();
    if (minutes !== 0) onChange(minutes);
  }

  const asDate = new Date();
  asDate.setHours(Math.floor(value / 60), value % 60, 0, 0);

  return (
    <View accessibilityRole="radiogroup" className="gap-3">
      <Option
        selected={!custom}
        title="Midnight"
        description="A night's sleep is split across two days."
        onPress={() => onChange(0)}
      />
      <Option
        selected={custom}
        title="Custom time"
        description="Keeps each night in one day."
        onPress={() => onChange(custom ? value : 420)}
      >
        {custom && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Day start time"
            onPress={() => setPicking((current) => !current)}
            className="mt-3 min-h-tap justify-center self-start rounded-button border border-line-strong bg-raised px-4"
          >
            <Text className="font-semibold text-body text-ink">{minutesToClock(value)}</Text>
          </Pressable>
        )}
        {custom && picking && (
          <DateTimePicker value={asDate} mode="time" minuteInterval={15} display="spinner" onChange={handle} />
        )}
      </Option>
    </View>
  );
}

function Option({
  selected,
  title,
  description,
  onPress,
  children,
}: {
  selected: boolean;
  title: string;
  description: string;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  return (
    <View
      className={`rounded-card border p-4 ${selected ? 'border-primary bg-primary-soft' : 'border-line bg-raised'}`}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={title}
        onPress={onPress}
        className="flex-row gap-3"
      >
        <View
          className={`mt-0.5 size-6 items-center justify-center rounded-full border-2 ${selected ? 'border-primary bg-primary' : 'border-line-strong'}`}
        />
        <View className="flex-1">
          <Text className="font-semibold text-row-title text-ink">{title}</Text>
          <Text className="font-sans text-meta text-ink-2">{description}</Text>
        </View>
      </Pressable>
      {children}
    </View>
  );
}
