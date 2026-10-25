import { SIZE_LABELS, SIZES, type Size } from '@babble/domain';
import { Pressable, Text, View } from 'react-native';

const DOTS: Record<Size, number> = { tiny: 6, little: 10, medium: 14, large: 18, massive: 22 };

export function SizeSelector({
  label,
  labels = SIZE_LABELS,
  value,
  onChange,
}: {
  label: string;
  labels?: Record<Size, string>;
  value: Size | null;
  onChange: (value: Size | null) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <View accessibilityRole="radiogroup" className="flex-row gap-2">
        {SIZES.map((size) => {
          const selected = value === size;
          return (
            <Pressable
              key={size}
              accessibilityRole="radio"
              accessibilityLabel={labels[size]}
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(selected ? null : size)}
              className={`h-[72px] flex-1 items-center justify-center gap-2 rounded-tile border ${selected ? 'border-primary bg-primary-soft' : 'border-line bg-raised'}`}
            >
              <View className="h-6 justify-center">
                <View
                  className={`rounded-full ${selected ? 'bg-primary' : 'bg-ink-3'}`}
                  style={{ width: DOTS[size], height: DOTS[size] }}
                />
              </View>
              <Text
                className={`text-caption ${selected ? 'font-semibold text-on-primary-soft' : 'font-sans text-ink-2'}`}
              >
                {labels[size]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
