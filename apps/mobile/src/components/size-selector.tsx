import type { Size } from '@babble/domain';
import { Pressable, Text, View } from 'react-native';

const SIZES: { value: Size; label: string; dot: number }[] = [
  { value: 'tiny', label: 'Tiny', dot: 6 },
  { value: 'little', label: 'Little', dot: 10 },
  { value: 'medium', label: 'Medium', dot: 14 },
  { value: 'large', label: 'Large', dot: 18 },
  { value: 'massive', label: 'Massive', dot: 22 },
];

export function SizeSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Size | null;
  onChange: (value: Size | null) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <View accessibilityRole="radiogroup" className="flex-row gap-2">
        {SIZES.map((size) => {
          const selected = value === size.value;
          return (
            <Pressable
              key={size.value}
              accessibilityRole="radio"
              accessibilityLabel={size.label}
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(selected ? null : size.value)}
              className={`h-[72px] flex-1 items-center justify-center gap-2 rounded-tile border ${selected ? 'border-primary bg-primary-soft' : 'border-line bg-raised'}`}
            >
              <View className="h-6 justify-center">
                <View
                  className={`rounded-full ${selected ? 'bg-primary' : 'bg-ink-3'}`}
                  style={{ width: size.dot, height: size.dot }}
                />
              </View>
              <Text
                className={`text-caption ${selected ? 'font-semibold text-on-primary-soft' : 'font-sans text-ink-2'}`}
              >
                {size.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
