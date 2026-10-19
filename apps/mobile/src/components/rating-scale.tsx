import { Pressable, Text, View } from 'react-native';

export function RatingScale<T extends number>({
  label,
  options,
  labels,
  value,
  onChange,
  low,
  high,
}: {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (value: T | null) => void;
  low: string;
  high: string;
}) {
  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <View className="flex-row gap-2" accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${option}: ${labels[option]}`}
              onPress={() => onChange(selected ? null : option)}
              className={`h-12 flex-1 items-center justify-center rounded-chip border ${selected ? 'border-sleep bg-sleep' : 'border-line bg-raised'}`}
            >
              <Text className={`font-semibold text-row-title ${selected ? 'text-ink-on-solid' : 'text-ink'}`}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row justify-between gap-3">
        <Text className="font-sans text-meta text-ink-3">{low}</Text>
        <Text className="text-right font-sans text-meta text-ink-3">{high}</Text>
      </View>
      {value !== null && <Text className="font-semibold text-meta text-on-sleep">{labels[value]}</Text>}
    </View>
  );
}
