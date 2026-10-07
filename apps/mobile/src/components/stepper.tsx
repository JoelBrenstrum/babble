import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTokenColor } from '@/lib/theme';

export function Stepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  max,
  unit,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  step: number;
  min?: number;
  max?: number;
  unit: string;
}) {
  const iconColor = useTokenColor('--ink');
  const placeholderColor = useTokenColor('--ink-3');
  const clamp = (next: number) => Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, next));
  return (
    <View className="gap-2">
      <Text className="font-semibold text-label text-ink">{label}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label.toLowerCase()} by ${step}`}
          onPress={() => onChange(value === null ? null : clamp(value - step))}
          className="size-tap items-center justify-center rounded-full border border-line bg-raised"
        >
          <Minus size={20} color={iconColor} strokeWidth={2.75} />
        </Pressable>
        <View className="h-tap flex-1 flex-row items-center justify-center gap-1 rounded-button bg-surface">
          <TextInput
            accessibilityLabel={label}
            keyboardType="decimal-pad"
            placeholder="—"
            placeholderTextColor={placeholderColor}
            className="min-w-16 text-center font-semibold text-timer-md text-ink"
            value={value === null ? '' : String(value)}
            onChangeText={(text) => {
              const raw = text.trim();
              if (raw === '') return onChange(null);
              const parsed = Number(raw);
              if (!Number.isNaN(parsed)) onChange(parsed);
            }}
          />
          <Text className="font-sans text-meta text-ink-2">{unit}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label.toLowerCase()} by ${step}`}
          onPress={() => onChange(clamp((value ?? 0) + step))}
          className="size-tap items-center justify-center rounded-full border border-line bg-raised"
        >
          <Plus size={20} color={iconColor} strokeWidth={2.75} />
        </Pressable>
      </View>
    </View>
  );
}
