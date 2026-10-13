import type { WeeklySummary } from '@babble/domain';
import { CalendarDays, Minus, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Card } from '@/components/card';
import { PlusBadge } from '@/components/plus';
import { useTokenColor } from '@/lib/theme';

const TREND = { up: TrendingUp, down: TrendingDown, same: Minus };

export function WeeklySummaryCard({ summary, plusBadge = false }: { summary: WeeklySummary; plusBadge?: boolean }) {
  const icon = useTokenColor('--on-primary-soft');
  const muted = useTokenColor('--ink-2');
  return (
    <Card className="gap-4 p-5">
      <View className="flex-row items-center gap-3">
        <View className="size-9 items-center justify-center rounded-full bg-primary-soft">
          <CalendarDays size={16} color={icon} strokeWidth={2.75} />
        </View>
        <View className="flex-1">
          <Text accessibilityRole="header" className="font-semibold text-row-title text-ink">
            This week
          </Text>
          <Text className="font-sans text-caption text-ink-3">
            The last 7 finished days, compared with the 7 before
          </Text>
        </View>
        {plusBadge && <PlusBadge />}
      </View>
      <Text className="font-semibold text-body text-ink">{summary.takeaway}</Text>
      <View className="flex-row flex-wrap gap-2">
        {summary.rows.map((row) => {
          const Icon = row.trend ? TREND[row.trend] : null;
          return (
            <View
              key={row.label}
              className="min-w-[47%] flex-1 flex-row items-center justify-between gap-2 rounded-tile bg-surface px-3 py-2"
            >
              <View>
                <Text className="font-sans text-caption text-ink-2">{row.label}</Text>
                <Text className="font-semibold text-label text-ink">{row.value}</Text>
              </View>
              {row.change && Icon && (
                <View className="flex-row items-center gap-1">
                  <Icon size={14} color={muted} strokeWidth={2.75} />
                  <Text className="font-semibold text-caption text-ink-2">{row.change}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}
