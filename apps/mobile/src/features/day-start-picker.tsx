import { DEFAULT_CUSTOM_DAY_START_MIN, minutesToClock } from '@babble/domain';
import { Pressable, Text, View } from 'react-native';

function nightEndDescription(minutes: number): string {
  return `Each day starts at ${minutesToClock(minutes || DEFAULT_CUSTOM_DAY_START_MIN)}, keeping each night in one day. Change it under Night in Settings.`;
}

export function DayStartPicker({
  value,
  nightEnd = DEFAULT_CUSTOM_DAY_START_MIN,
  onChange,
}: {
  value: number;
  nightEnd?: number;
  onChange: (minutes: number) => void;
}) {
  const custom = value !== 0;
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
        title="When the night ends"
        description={nightEndDescription(custom ? value : nightEnd)}
        onPress={() => onChange(custom ? value : nightEnd || DEFAULT_CUSTOM_DAY_START_MIN)}
      />
    </View>
  );
}

function Option({
  selected,
  title,
  description,
  onPress,
}: {
  selected: boolean;
  title: string;
  description: string;
  onPress: () => void;
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
    </View>
  );
}
