import { TRACKERS } from '@babble/domain';
import { Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { BabyHeader } from '@/components/baby-header';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { TrackerIcon } from '@/components/tracker-icon';
import { useTokenColor } from '@/lib/theme';
import { useReadyState } from '@/lib/use-onboarding';

export default function Home() {
  const ready = useReadyState();
  const iconColor = useTokenColor('--ink-2');
  if (!ready) return null;

  return (
    <Screen edges={['top']}>
      <BabyHeader family={ready.family} baby={ready.baby} />
      <Card className="mt-6 flex-row">
        {['Sleep today', 'Feeds', 'Nappies'].map((label, index) => (
          <View key={label} className={`flex-1 px-4 py-4 ${index > 0 ? 'border-l border-line' : ''}`}>
            <Text className="font-sans text-meta text-ink-2">{label}</Text>
            <Text className="font-bold text-heading text-ink">—</Text>
          </View>
        ))}
      </Card>
      <Card className="mt-4">
        {TRACKERS.map((tracker, index) => (
          <View
            key={tracker.key}
            className={`flex-row items-center gap-4 px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}
          >
            <TrackerIcon tracker={tracker} />
            <View className="flex-1">
              <Text className="font-semibold text-row-title text-ink">{tracker.label}</Text>
              <Text className="font-sans text-meta text-ink-2">Nothing logged yet</Text>
            </View>
            <Pressable
              disabled
              accessibilityLabel={`Log ${tracker.label.toLowerCase()}`}
              className="size-tap items-center justify-center rounded-full border border-line opacity-45"
            >
              <Plus size={20} color={iconColor} strokeWidth={2.75} />
            </Pressable>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
