import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useTokenColor } from '@/lib/theme';

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

function Chip({ selected, label, onPress }: { selected: boolean; label: string; onPress: () => void }) {
  const checkColor = useTokenColor('--on-primary-soft');
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={`h-11 flex-row items-center gap-1.5 rounded-chip border px-4 ${selected ? 'border-primary bg-primary-soft' : 'border-line bg-raised'}`}
    >
      {selected && <Check size={16} color={checkColor} strokeWidth={3} />}
      <Text className={`text-label ${selected ? 'font-semibold text-on-primary-soft' : 'font-sans text-ink'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function MultiChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly ChipOption<T>[];
  value: readonly T[];
  onChange: (value: T[]) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option.value);
          return (
            <Chip
              key={option.value}
              label={option.label}
              selected={selected}
              onPress={() => onChange(selected ? value.filter((v) => v !== option.value) : [...value, option.value])}
            />
          );
        })}
      </View>
    </View>
  );
}

export function SingleChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly ChipOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onChange(value === option.value ? null : option.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function CheckRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const checkColor = useTokenColor('--on-primary');
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      className="min-h-tap flex-row items-center gap-3"
    >
      <View
        className={`size-6 items-center justify-center rounded-md border-2 ${value ? 'border-primary bg-primary' : 'border-line-strong'}`}
      >
        {value && <Check size={16} color={checkColor} strokeWidth={3} />}
      </View>
      <Text className="font-sans text-body text-ink">{label}</Text>
    </Pressable>
  );
}
