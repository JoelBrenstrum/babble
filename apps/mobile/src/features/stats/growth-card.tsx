import { formatShortDate, type GrowthChart, type GrowthReport } from '@babble/domain';
import { router } from 'expo-router';
import { Ruler } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Card } from '@/components/card';
import { StatusMessage } from '@/components/status-message';
import { useTokenColor } from '@/lib/theme';

const WIDTH = 320;
const HEIGHT = 180;
const PAD = { left: 34, right: 8, top: 10, bottom: 22 };

function niceStep(range: number): number {
  const raw = range / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((factor) => factor * magnitude).find((step) => step >= raw) ?? raw;
}

export function GrowthCard({
  report,
  babyName,
  timeZone,
}: {
  report: GrowthReport;
  babyName: string;
  timeZone: string;
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
        report.charts.map((chart) => <GrowthChartView key={chart.key} chart={chart} timeZone={timeZone} />)
      )}
      {report.charts.some((chart) => chart.curves.length > 0) && (
        <Text className="font-sans text-caption text-ink-3">
          Lines show the WHO 3rd, 15th, 50th, 85th and 97th percentiles, up to 2 years.
        </Text>
      )}
    </Card>
  );
}

function GrowthChartView({ chart, timeZone }: { chart: GrowthChart; timeZone: string }) {
  const growth = useTokenColor('--growth');
  const muted = useTokenColor('--ink-3');
  const line = useTokenColor('--line');
  const raised = useTokenColor('--raised');
  const x = (months: number) => PAD.left + (months / chart.xMax) * (WIDTH - PAD.left - PAD.right);
  const y = (value: number) =>
    PAD.top + (1 - (value - chart.yMin) / (chart.yMax - chart.yMin)) * (HEIGHT - PAD.top - PAD.bottom);
  const path = (points: { months: number; value: number }[]) =>
    points
      .map((point, index) => `${index ? 'L' : 'M'}${x(point.months).toFixed(1)},${y(point.value).toFixed(1)}`)
      .join(' ');
  const yStep = niceStep(chart.yMax - chart.yMin);
  const yTicks: number[] = [];
  for (let value = Math.ceil(chart.yMin / yStep) * yStep; value <= chart.yMax; value += yStep) yTicks.push(value);
  const xStep = chart.xMax <= 6 ? 1 : chart.xMax <= 12 ? 2 : chart.xMax <= 24 ? 3 : 6;
  const xTicks: number[] = [];
  for (let months = 0; months <= chart.xMax; months += xStep) xTicks.push(months);

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
      <Svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        accessibilityLabel={`${chart.label} by age in months`}
      >
        {yTicks.map((value) => (
          <Line key={`y${value}`} x1={PAD.left} x2={WIDTH - PAD.right} y1={y(value)} y2={y(value)} stroke={line} />
        ))}
        {yTicks.map((value) => (
          <SvgText key={`t${value}`} x={PAD.left - 6} y={y(value) + 3} textAnchor="end" fontSize={10} fill={muted}>
            {String(Math.round(value * 10) / 10)}
          </SvgText>
        ))}
        {xTicks.map((months) => (
          <SvgText key={`x${months}`} x={x(months)} y={HEIGHT - 6} textAnchor="middle" fontSize={10} fill={muted}>
            {String(months)}
          </SvgText>
        ))}
        <SvgText x={PAD.left - 6} y={PAD.top - 2} textAnchor="end" fontSize={10} fill={muted}>
          {chart.unit}
        </SvgText>
        {chart.curves.map((curve) => (
          <Path
            key={curve.percentile}
            d={path(curve.points)}
            fill="none"
            strokeWidth={1.5}
            stroke={curve.percentile === 50 ? growth : muted}
            strokeOpacity={
              curve.percentile === 50 ? 0.6 : curve.percentile === 3 || curve.percentile === 97 ? 0.5 : 0.35
            }
            strokeDasharray={curve.percentile === 3 || curve.percentile === 97 ? '3 3' : undefined}
          />
        ))}
        {chart.points.length > 1 && <Path d={path(chart.points)} fill="none" strokeWidth={2} stroke={growth} />}
        {chart.points.map((point, index) => (
          <Circle
            key={index}
            cx={x(point.months)}
            cy={y(point.value)}
            r={3.5}
            fill={growth}
            stroke={raised}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
    </View>
  );
}
