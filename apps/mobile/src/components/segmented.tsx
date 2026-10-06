import { Pressable, Text, View } from 'react-native';

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row gap-1 rounded-button bg-surface p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.value)}
            className={`h-11 flex-1 items-center justify-center rounded-tile ${selected ? 'bg-raised' : ''}`}
          >
            <Text className={`text-label ${selected ? 'font-bold text-ink' : 'font-medium text-ink-2'}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
