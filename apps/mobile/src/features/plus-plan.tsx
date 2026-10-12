import type { PlanSummary } from '@babble/config';
import { Check, Sparkles } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Card, SectionLabel } from '@/components/card';
import { useTokenColor } from '@/lib/theme';

export function PlusPlan({ summary }: { summary: PlanSummary }) {
  const primary = useTokenColor('--primary');
  return (
    <View className="gap-3">
      <SectionLabel>Babble Plus</SectionLabel>
      <Card className="gap-4 p-5">
        <View className="flex-row items-center gap-3">
          <Sparkles color={primary} size={20} strokeWidth={2.75} />
          <Text className="flex-1 font-semibold text-row-title text-ink">{summary.plus ? 'Plus' : 'Free'}</Text>
          {summary.plus && (
            <View className="rounded-chip bg-primary-soft px-2.5 py-0.5">
              <Text className="font-bold text-caption text-on-primary-soft">Active</Text>
            </View>
          )}
        </View>
        <Text className="font-sans text-body text-ink-2">{summary.status}</Text>
        <View className="gap-2">
          <Text className="font-semibold text-meta text-ink-2">{summary.plus ? 'Included' : 'Plus adds'}</Text>
          {summary.highlights.map((highlight) => (
            <View key={highlight} className="flex-row items-start gap-2">
              <Check color={primary} size={16} strokeWidth={2.75} style={{ marginTop: 3 }} />
              <Text className="flex-1 font-sans text-body text-ink">{highlight}</Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}
