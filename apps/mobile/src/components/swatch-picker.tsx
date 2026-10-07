import type { PooColour } from '@babble/domain';
import { Stethoscope } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useTokenColor } from '@/lib/theme';
import { CAUTION_COLOURS, POO_COLOURS, PooSwatch } from './poo-swatch';

export function SwatchPicker({
  value,
  onChange,
}: {
  value: readonly PooColour[];
  onChange: (value: PooColour[]) => void;
}) {
  const full = value.length >= 2;
  const caution = value.some((colour) => CAUTION_COLOURS.includes(colour));
  const cautionColor = useTokenColor('--on-caution');
  const summary = value.map((colour) => POO_COLOURS.find((c) => c.value === colour)!.label).join(' + ');

  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-semibold text-label text-ink">Poo colour</Text>
        <Text className="font-sans text-meta text-ink-2">
          {summary ? `${summary} · ${value.length} of 2` : 'Pick up to 2'}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-y-3">
        {POO_COLOURS.map((colour) => {
          const index = value.indexOf(colour.value);
          const selected = index >= 0;
          const disabled = full && !selected;
          return (
            <Pressable
              key={colour.value}
              accessibilityRole="checkbox"
              accessibilityLabel={colour.label}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(selected ? value.filter((v) => v !== colour.value) : [...value, colour.value])}
              className={`w-1/5 items-center gap-1 ${disabled ? 'opacity-45' : ''}`}
            >
              <View
                className={`rounded-full p-0.5 ${selected ? 'border-2 border-ink' : 'border-2 border-transparent'}`}
              >
                <PooSwatch colours={[colour.value]} size={40} />
              </View>
              {selected && (
                <View className="absolute right-2 top-0 size-5 items-center justify-center rounded-full bg-ink">
                  <Text className="font-bold text-caption text-bg">{index + 1}</Text>
                </View>
              )}
              <Text className="text-center font-sans text-caption text-ink-2">{colour.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {caution && (
        <View className="flex-row gap-3 rounded-tile bg-caution-soft px-4 py-3">
          <Stethoscope size={16} color={cautionColor} strokeWidth={2.75} />
          <Text className="flex-1 font-sans text-meta text-on-caution">
            Worth checking with your provider. Red, black or white poo can need a closer look.
          </Text>
        </View>
      )}
    </View>
  );
}
