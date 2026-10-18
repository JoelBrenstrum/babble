import {
  formatShortDate,
  growthChartGeometry,
  growthEstimateReadout,
  growthMilestoneText,
  growthPointReadout,
  growthReadout,
  milestoneIndex,
  milestoneKey,
  type GrowthChart,
  type GrowthPointKey,
  type GrowthReport,
} from '@babble/domain';
import { router } from 'expo-router';
import { Ruler } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Card } from '@/components/card';
import { PlusBadge } from '@/components/plus';
import { StatusMessage } from '@/components/status-message';
import { useTokenColor } from '@/lib/theme';

const SIZE = { width: 320, height: 180, pad: { left: 34, right: 8, top: 10, bottom: 22 } };

export function GrowthCard({
  report,
  babyName,
  timeZone,
  plusBadge = false,
}: {
  report: GrowthReport;
  babyName: string;
  timeZone: string;
  plusBadge?: boolean;
}) {
  const ink = useTokenColor('--on-growth');
  return (
    <Card className="gap-4 p-5">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-growth-soft">
          <Ruler size={16} color={ink} strokeWidth={2.75} />
        </View>
        <Text accessibilityRole="header" className="flex-1 font-semibold text-row-title text-ink">
          Growth
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/track/growth/new')}
          className="min-h-tap justify-center"
        >
          <Text className="font-semibold text-meta text-primary">Log growth</Text>
        </Pressable>
      </View>
      {report.needsSex && (
        <StatusMessage tone="info">{`Set ${babyName}'s sex in Settings to compare with the WHO growth charts.`}</StatusMessage>
      )}
      {report.charts.length === 0 ? (
        <Text className="font-sans text-body text-ink-2">
          No growth entries yet. Log a weight, length or head size to chart it.
        </Text>
      ) : (
        report.charts.map((chart) => (
          <GrowthChartView key={chart.key} chart={chart} timeZone={timeZone} plusBadge={plusBadge} />
        ))
      )}
      {report.charts.some((chart) => chart.curves.length > 0) && (
        <Text className="font-sans text-caption text-ink-3">
          Lines show the WHO 3rd, 15th, 50th, 85th and 97th percentiles, up to 2 years.
        </Text>
      )}
      {report.charts.some((chart) => chart.estimate || chart.milestones.length > 0) && (
        <Text className="font-sans text-caption text-ink-3">
          Today's estimate and the milestones after it follow the trend of the last few measurements. They're a guide,
          not a measurement.
        </Text>
      )}
    </Card>
  );
}

function GrowthChartView({ chart, timeZone, plusBadge }: { chart: GrowthChart; timeZone: string; plusBadge: boolean }) {
  const growth = useTokenColor('--growth');
  const muted = useTokenColor('--ink-3');
  const line = useTokenColor('--line');
  const raised = useTokenColor('--raised');
  const { width, height, pad, x, y, curves, measuredPath, aheadPath, yTicks, xTicks } = growthChartGeometry(
    chart,
    SIZE,
  );
  const [selected, setSelected] = useState<GrowthPointKey | null>(null);
  const { estimate } = chart;
  const readout = growthReadout(chart, selected, timeZone)?.text ?? null;
  const selectedMilestone = milestoneIndex(selected);
  const toggle = (key: GrowthPointKey) => () => setSelected(selected === key ? null : key);

  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-semibold text-label text-ink">{chart.label}</Text>
        <View className="items-end">
          <Text className="font-bold text-label text-ink">{chart.latest.value}</Text>
          {chart.latest.percentile && (
            <Text className="font-sans text-caption text-ink-2">{`${chart.latest.percentile} percentile`}</Text>
          )}
          <Text className="font-sans text-caption text-ink-3">{formatShortDate(chart.latest.at, timeZone)}</Text>
        </View>
      </View>
      {estimate && (
        <View className="flex-row items-center justify-between gap-2 rounded-tile bg-growth-soft px-3 py-2">
          <View className="flex-1">
            <Text className="font-sans text-caption text-on-growth">Estimate for today</Text>
            <Text className="font-bold text-label text-on-growth">
              {estimate.percentile ? `${estimate.reading} · ${estimate.percentile} percentile` : estimate.reading}
            </Text>
          </View>
          {plusBadge && <PlusBadge />}
        </View>
      )}
      <Text className={readout ? 'font-semibold text-caption text-ink' : 'font-sans text-caption text-ink-3'}>
        {readout ?? 'Tap a point to see it'}
      </Text>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        accessibilityLabel={`${chart.label} by age in months`}
      >
        {yTicks.map((tick) => (
          <Line key={`y${tick.value}`} x1={pad.left} x2={width - pad.right} y1={tick.y} y2={tick.y} stroke={line} />
        ))}
        {yTicks.map((tick) => (
          <SvgText key={`t${tick.value}`} x={pad.left - 6} y={tick.y + 3} textAnchor="end" fontSize={10} fill={muted}>
            {tick.label}
          </SvgText>
        ))}
        {xTicks.map((tick) => (
          <SvgText key={`x${tick.months}`} x={tick.x} y={height - 6} textAnchor="middle" fontSize={10} fill={muted}>
            {String(tick.months)}
          </SvgText>
        ))}
        <SvgText x={pad.left - 6} y={pad.top - 2} textAnchor="end" fontSize={10} fill={muted}>
          {chart.unit}
        </SvgText>
        {curves.map((curve) => (
          <Path
            key={curve.percentile}
            d={curve.d}
            fill="none"
            strokeWidth={1.5}
            stroke={curve.percentile === 50 ? growth : muted}
            strokeOpacity={
              curve.percentile === 50 ? 0.6 : curve.percentile === 3 || curve.percentile === 97 ? 0.5 : 0.35
            }
            strokeDasharray={curve.percentile === 3 || curve.percentile === 97 ? '3 3' : undefined}
          />
        ))}
        {measuredPath && <Path d={measuredPath} fill="none" strokeWidth={2} stroke={growth} />}
        {chart.points.map((point, index) => (
          <Circle
            key={index}
            cx={x(point.months)}
            cy={y(point.value)}
            r={selected === index ? 5.5 : 3.5}
            fill={growth}
            stroke={raised}
            strokeWidth={1.5}
          />
        ))}
        {aheadPath && <Path d={aheadPath} fill="none" stroke={growth} strokeWidth={2} strokeDasharray="4 3" />}
        {chart.milestones.map((point, index) => (
          <Circle
            key={point.reading}
            cx={x(point.months)}
            cy={y(point.value)}
            r={selectedMilestone === index ? 5 : 3}
            fill={raised}
            stroke={growth}
            strokeWidth={1.5}
          />
        ))}
        {estimate && (
          <Circle
            cx={x(estimate.months)}
            cy={y(estimate.value)}
            r={selected === 'estimate' ? 5.5 : 4}
            fill={raised}
            stroke={growth}
            strokeWidth={2}
          />
        )}
        {estimate && (
          <Circle
            testID={`growth-estimate-${chart.key}`}
            accessibilityLabel={growthEstimateReadout(estimate)}
            cx={x(estimate.months)}
            cy={y(estimate.value)}
            r={14}
            fill="transparent"
            onPress={toggle('estimate')}
          />
        )}
        {chart.milestones.map((point, index) => (
          <Circle
            key={`hit-${point.reading}`}
            testID={`growth-milestone-${chart.key}-${index}`}
            accessibilityLabel={growthMilestoneText(point)}
            cx={x(point.months)}
            cy={y(point.value)}
            r={14}
            fill="transparent"
            onPress={toggle(milestoneKey(index))}
          />
        ))}
        {chart.points.map((point, index) => (
          <Circle
            key={`hit${index}`}
            testID={`growth-point-${chart.key}-${index}`}
            accessibilityLabel={growthPointReadout(point, timeZone)}
            cx={x(point.months)}
            cy={y(point.value)}
            r={14}
            fill="transparent"
            onPress={toggle(index)}
          />
        ))}
      </Svg>
    </View>
  );
}
