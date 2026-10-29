import type { ReportResult, Units } from '@babble/domain';
import { ChartColumn, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '@/components/card';
import { PlusBadge } from '@/components/plus';
import { useTokenColor } from '@/lib/theme';
import { ReportChart } from './report-chart';
import { TILE_LOOK, toneLook } from './tones';

export function ReportCard({
  result,
  units,
  title,
  meta,
  icon: Icon = ChartColumn,
  group = 'logging',
  compact = false,
  loading = false,
  plusBadge = false,
  right,
  footer,
}: {
  result: ReportResult | null;
  units: Units;
  title: string;
  meta?: string | null;
  icon?: LucideIcon;
  group?: string;
  compact?: boolean;
  loading?: boolean;
  plusBadge?: boolean;
  right?: ReactNode;
  footer?: ReactNode;
}) {
  const tile = TILE_LOOK[group] ?? TILE_LOOK.logging!;
  const iconColor = useTokenColor(tile.token);
  const spinner = useTokenColor('--primary');
  return (
    <Card className={`gap-4 ${compact ? 'p-4' : 'p-5'}`}>
      <View className="flex-row items-center gap-3">
        <View className={`h-9 w-9 items-center justify-center rounded-full ${tile.className}`}>
          <Icon size={16} color={iconColor} strokeWidth={2.75} />
        </View>
        <View className="flex-1">
          <Text accessibilityRole="header" className="font-semibold text-row-title text-ink" numberOfLines={1}>
            {title}
          </Text>
          {meta && (
            <Text className="font-sans text-caption text-ink-2" numberOfLines={1}>
              {meta}
            </Text>
          )}
        </View>
        {plusBadge && <PlusBadge />}
        {right}
      </View>
      {result && !compact && result.figures.length > 0 && result.spec.chart !== 'number' && (
        <View className="flex-row flex-wrap gap-2">
          {result.figures.map((figure) => (
            <View key={figure.label} className="min-w-[46%] flex-1 rounded-tile bg-surface px-3 py-2">
              <Text className="font-sans text-caption text-ink-2">{figure.label}</Text>
              <Text className="font-semibold text-label text-ink">{figure.value}</Text>
              {figure.delta && (
                <Text className="font-sans text-caption text-ink-3">{figure.delta} on the previous period</Text>
              )}
            </View>
          ))}
        </View>
      )}
      <View className="gap-1.5" style={{ opacity: loading ? 0.6 : 1 }}>
        {!result ? (
          <ActivityIndicator color={spinner} className="py-10" />
        ) : result.empty ? (
          <Text className="py-12 text-center font-sans text-meta text-ink-3">Nothing logged in this range yet</Text>
        ) : (
          <>
            {!compact && result.series.length > 1 && result.spec.chart !== 'donut' && result.spec.chart !== 'table' && (
              <View className="flex-row flex-wrap gap-x-3 gap-y-1">
                {result.series.map((series) => {
                  const look = toneLook(series.tone);
                  return (
                    <View key={series.key} className="flex-row items-center gap-1.5">
                      <View className={`h-2.5 w-2.5 rounded-sm ${look.className}`} style={{ opacity: look.opacity }} />
                      <Text className="font-sans text-caption text-ink-3">{series.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}
            <ReportChart result={result} units={units} compact={compact} />
          </>
        )}
      </View>
      {footer}
    </Card>
  );
}
