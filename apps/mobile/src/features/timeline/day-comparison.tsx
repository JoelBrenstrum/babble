import type { DayComparison } from '@babble/domain';
import { ArrowLeftRight, Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Card } from '@/components/card';
import { PlusBadge } from '@/components/plus';
import { useTokenColor } from '@/lib/theme';

const TREND = { up: TrendingUp, down: TrendingDown, same: Minus };

export function DayComparisonCard({
  comparison,
  currentLabel,
  plusBadge,
}: {
  comparison: DayComparison;
  currentLabel: string;
  plusBadge: boolean;
}) {
  const icon = useTokenColor('--on-primary-soft');
  const muted = useTokenColor('--ink-2');
  return (
    <Card className="gap-4 p-5">
      <View className="flex-row items-center gap-3">
        <View className="size-9 items-center justify-center rounded-full bg-primary-soft">
          <ArrowLeftRight size={16} color={icon} strokeWidth={2.75} />
        </View>
        <View className="flex-1">
          <Text accessibilityRole="header" className="font-semibold text-row-title text-ink">
            {comparison.title}
          </Text>
          <Text className="font-sans text-caption text-ink-3">{comparison.note}</Text>
        </View>
        {plusBadge && <PlusBadge />}
      </View>
      <View>
        <View className="flex-row pb-1">
          <View className="flex-1" />
          <Text className="w-20 text-right font-semibold text-caption text-ink-3">{comparison.previousLabel}</Text>
          <Text className="w-20 text-right font-semibold text-caption text-ink-3">{currentLabel}</Text>
          <View className="w-20" />
        </View>
        {comparison.rows.map((row) => {
          const Icon = TREND[row.trend];
          return (
            <View
              key={row.key}
              accessible
              accessibilityLabel={`${row.label}: ${comparison.previousLabel} ${row.previous}, ${currentLabel} ${row.value}, ${row.change}`}
              className="flex-row items-center border-t border-line py-2"
            >
              <Text className="flex-1 font-sans text-label text-ink-2">{row.label}</Text>
              <Text className="w-20 text-right font-sans text-label text-ink-2">{row.previous}</Text>
              <Text className="w-20 text-right font-semibold text-label text-ink">{row.value}</Text>
              <View className="w-20 flex-row items-center justify-end gap-1">
                <Icon size={14} color={muted} strokeWidth={2.75} />
                <Text className="font-semibold text-caption text-ink-2">{row.change}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
