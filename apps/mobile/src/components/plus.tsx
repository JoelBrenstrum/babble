import { plusPitch, type PlusFeature } from '@babble/config';
import { Check, Sparkles } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTokenColor } from '@/lib/theme';
import { Button } from './button';

export function PlusBadge() {
  const color = useTokenColor('--on-primary-soft');
  return (
    <View className="flex-row items-center gap-1 rounded-chip bg-primary-soft px-2 py-0.5">
      <Sparkles size={12} color={color} strokeWidth={3} />
      <Text className="font-bold text-caption text-on-primary-soft">Plus</Text>
    </View>
  );
}

export function PlusPitch({ feature, onClose }: { feature: PlusFeature; onClose: () => void }) {
  const icon = useTokenColor('--on-primary-soft');
  const check = useTokenColor('--primary');
  const pitch = plusPitch(feature);
  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-3">
        <View className="size-11 items-center justify-center rounded-full bg-primary-soft">
          <Sparkles size={20} color={icon} strokeWidth={2.75} />
        </View>
        <Text accessibilityRole="header" className="font-bold text-heading text-ink">
          Babble Plus
        </Text>
      </View>
      <Text className="font-sans text-body text-ink-2">{pitch.reason}</Text>
      <View className="gap-2">
        {pitch.highlights.map((highlight) => (
          <View key={highlight} className="flex-row items-start gap-2">
            <Check color={check} size={16} strokeWidth={2.75} style={{ marginTop: 3 }} />
            <Text className="flex-1 font-sans text-body text-ink">{highlight}</Text>
          </View>
        ))}
      </View>
      <View className="gap-2">
        <Button disabled>Subscribe to Plus</Button>
        <Text className="text-center font-sans text-meta text-ink-2">{pitch.note}</Text>
        <Button variant="secondary" onPress={onClose}>
          Not now
        </Button>
      </View>
    </View>
  );
}

export function PlusDialog({ feature, onClose }: { feature: PlusFeature | null; onClose: () => void }) {
  return (
    <Modal visible={feature !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close" className="flex-1 bg-scrim/40" onPress={onClose} />
      {feature && (
        <SafeAreaView edges={['bottom']} className="gap-4 rounded-t-sheet bg-raised px-5 pb-4 pt-3">
          <View className="h-1.5 w-10 self-center rounded-full bg-line-strong" />
          <PlusPitch feature={feature} onClose={onClose} />
        </SafeAreaView>
      )}
    </Modal>
  );
}
