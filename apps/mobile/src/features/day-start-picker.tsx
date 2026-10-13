import { DEFAULT_CUSTOM_DAY_START_MIN } from '@babble/domain';
import { Pressable, Text, View } from 'react-native';
import { TimeButton } from '@/components/time-button';

export function DayStartPicker({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
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
        title="Custom time"
        description="Keeps each night in one day."
        onPress={() => onChange(custom ? value : DEFAULT_CUSTOM_DAY_START_MIN)}
      >
        {custom && (
          <TimeButton
            label="Day start time"
            minutes={value}
            className="mt-3 self-start"
            onChange={(minutes) => minutes !== 0 && onChange(minutes)}
          />
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
