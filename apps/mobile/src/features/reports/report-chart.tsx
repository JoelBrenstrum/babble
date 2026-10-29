import {
  bucketReadout,
  donutSlices,
  donutTotal,
  formatReportValue,
  heatIntensity,
  hourLabel,
  lineGeometry,
  REPORT_PAD,
  type ReportResult,
  type Units,
} from '@babble/domain';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useTokenColor } from '@/lib/theme';
import { toneLook, useToneColor } from './tones';

const SIZE = { width: 320, height: 128, pad: REPORT_PAD };

function Readout({ lines }: { lines: string[] }) {
  return (
    <Text
      className={`min-h-8 ${lines.length ? 'font-semibold text-caption text-ink' : 'font-sans text-caption text-ink-3'}`}
    >
      {lines.length ? lines.join('\n') : 'Tap a bar to see its values'}
    </Text>
  );
}

function Bars({ result, units }: { result: ReportResult; units: Units }) {
  const [active, setActive] = useState<number | null>(null);
  const max = result.max > 0 ? result.max : 1;
  const stacked = result.spec.options.stack !== false;
  return (
    <View className="gap-1.5">
      <Readout lines={active === null ? [] : bucketReadout(result, active, units)} />
      <View
        className="h-32 flex-row items-end gap-[2px] border-b border-line"
        accessibilityLabel={`${result.series.map((series) => series.label).join(', ')} per ${result.spec.bucket}`}
      >
        {result.buckets.map((bucket, index) => {
          const values = result.series.map((series) => Math.max(0, series.values[index] ?? 0));
          const total = values.reduce((sum, value) => sum + value, 0);
          return (
            <Pressable
              key={bucket.key}
              accessibilityRole="button"
              accessibilityLabel={bucketReadout(result, index, units).join(' · ')}
              accessibilityState={{ selected: active === index }}
              onPress={() => setActive(active === index ? null : index)}
              className={`h-full flex-1 ${stacked ? 'flex-col-reverse' : 'flex-row items-end gap-px'} ${active === index ? 'opacity-80' : ''}`}
            >
              {result.series.map((series, order) => {
                const look = toneLook(series.tone);
                return (
                  <View
                    key={series.key}
                    className={`${look.className} ${stacked ? 'w-full' : 'flex-1'} rounded-t-sm`}
                    style={{ height: `${(values[order]! / max) * 100}%`, opacity: look.opacity }}
                  />
                );
              })}
              {total === 0 && <View className="h-px bg-line" />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Lines({ result, units, area }: { result: ReportResult; units: Units; area: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const stacked = area && result.spec.options.stack !== false && result.series.length > 1;
  const geometry = lineGeometry(result, SIZE, stacked);
  const line = useTokenColor('--line');
  const ink = useTokenColor('--ink');
  const muted = useTokenColor('--ink-3');
  const raised = useTokenColor('--raised');
  const colourOf = useToneColor();
  const colours = result.series.map((series) => toneLook(series.tone));
  const resolved = result.series.map((series) => colourOf(series.tone));
  const count = result.buckets.length;
  return (
    <View className="gap-1.5">
      <Readout lines={active === null ? [] : bucketReadout(result, active, units)} />
      <View className="border-b border-line">
        <Svg
          width="100%"
          height={128}
          viewBox={`0 0 ${SIZE.width} ${SIZE.height}`}
          accessibilityLabel={`${result.series.map((series) => series.label).join(', ')} over time`}
        >
          {geometry.yTicks.map((tick) => (
            <Line
              key={tick.label}
              x1={0}
              x2={SIZE.width}
              y1={tick.y}
              y2={tick.y}
              stroke={line}
              strokeWidth={1}
              strokeDasharray="2 4"
            />
          ))}
          {geometry.compare.map((item) => (
            <Path key={item.key} d={item.path} fill="none" stroke={muted} strokeWidth={1.5} strokeDasharray="4 3" />
          ))}
          {[...geometry.series].reverse().map((item, reversedIndex) => {
            const order = geometry.series.length - 1 - reversedIndex;
            const colour = resolved[order]!;
            const opacity = colours[order]!.opacity;
            return (
              <Path
                key={`${item.key}-fill`}
                d={area && item.areaPath ? item.areaPath : ''}
                fill={colour}
                fillOpacity={0.35 * opacity}
              />
            );
          })}
          {geometry.series.map((item, order) => (
            <Path
              key={item.key}
              d={item.path}
              fill="none"
              stroke={resolved[order]}
              strokeOpacity={colours[order]!.opacity}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {geometry.series.map(
            (item) =>
              item.averagePath && (
                <Path
                  key={`${item.key}-avg`}
                  d={item.averagePath}
                  fill="none"
                  stroke={ink}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                />
              ),
          )}
          {geometry.series.map((item, order) =>
            item.points
              .filter((point) => point.index === active)
              .map((point) => (
                <Circle
                  key={`${item.key}-${point.index}`}
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill={raised}
                  stroke={resolved[order]}
                  strokeWidth={2}
                />
              )),
          )}
        </Svg>
        <View className="absolute inset-0 flex-row">
          {result.buckets.map((bucket, index) => (
            <Pressable
              key={bucket.key}
              accessibilityRole="button"
              accessibilityLabel={bucketReadout(result, index, units).join(' · ')}
              className="flex-1"
              onPress={() => setActive(active === index ? null : index)}
            />
          ))}
        </View>
      </View>
      {count > 1 && (
        <View className="flex-row justify-between">
          <Text className="font-sans text-caption text-ink-3">{result.buckets[0]!.title}</Text>
          <Text className="font-sans text-caption text-ink-3">
            {result.buckets.at(-1)!.lastDay === result.todayKey ? 'Today' : result.buckets.at(-1)!.title}
          </Text>
        </View>
      )}
    </View>
  );
}

const RADIUS = 60;
const THICKNESS = 18;

function Donut({ result, units }: { result: ReportResult; units: Units }) {
  const slices = donutSlices(result, RADIUS, THICKNESS);
  const raised = useTokenColor('--raised');
  const ink = useTokenColor('--ink');
  const muted = useTokenColor('--ink-3');
  const colourOf = useToneColor();
  const colours = slices.map((slice) => colourOf(slice.tone));
  return (
    <View className="items-center gap-4">
      <Svg
        width={160}
        height={160}
        viewBox={`${-RADIUS - 2} ${-RADIUS - 2} ${RADIUS * 2 + 4} ${RADIUS * 2 + 4}`}
        accessibilityLabel={`${result.series.map((series) => series.label).join(', ')} as a share of the total`}
      >
        {slices.map((slice, index) => (
          <Path
            key={slice.key}
            d={slice.d}
            fill={colours[index]}
            fillOpacity={toneLook(slice.tone).opacity}
            stroke={raised}
            strokeWidth={1.5}
          />
        ))}
        <SvgText x={0} y={-2} textAnchor="middle" fontSize={16} fontWeight="bold" fill={ink}>
          {formatReportValue(donutTotal(result), result.unit, units)}
        </SvgText>
        <SvgText x={0} y={14} textAnchor="middle" fontSize={9} fill={muted}>
          Total
        </SvgText>
      </Svg>
      <View className="w-full gap-1.5">
        {slices.map((slice) => {
          const look = toneLook(slice.tone);
          return (
            <View key={slice.key} className="flex-row items-center gap-2">
              <View className={`size-2.5 rounded-sm ${look.className}`} style={{ opacity: look.opacity }} />
              <Text className="flex-1 font-sans text-meta text-ink" numberOfLines={1}>
                {slice.label}
              </Text>
              <Text className="font-sans text-meta text-ink-2">
                {formatReportValue(slice.value, result.unit, units)}
              </Text>
              <Text className="w-10 text-right font-sans text-meta text-ink-3">
                {Math.round(slice.fraction * 100)}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Number({ result, units }: { result: ReportResult; units: Units }) {
  const series = result.series[0];
  const figure = result.figures[0];
  if (!series) return null;
  const delta = figure?.delta ?? null;
  const tone = delta?.startsWith('Up')
    ? 'bg-success-soft'
    : delta?.startsWith('Down')
      ? 'bg-caution-soft'
      : 'bg-surface';
  const text = delta?.startsWith('Up')
    ? 'text-on-success'
    : delta?.startsWith('Down')
      ? 'text-on-caution'
      : 'text-ink-2';
  return (
    <View className="gap-1">
      <Text className="font-sans text-caption text-ink-2">{figure?.label ?? series.label}</Text>
      <Text className="font-bold text-timer-md text-ink">{formatReportValue(series.total, series.unit, units)}</Text>
      {delta && (
        <View className={`self-start rounded-chip px-2 py-0.5 ${tone}`}>
          <Text
            className={`font-semibold text-caption ${text}`}
          >{`${delta} on the ${result.compare?.label.toLowerCase()}`}</Text>
        </View>
      )}
    </View>
  );
}

function Table({ result, units }: { result: ReportResult; units: Units }) {
  return (
    <View className="rounded-tile border border-line">
      <View className="flex-row bg-surface px-3 py-2">
        <Text className="flex-1 font-semibold text-caption text-ink-2">
          {result.spec.bucket === 'day' ? 'Day' : 'Period'}
        </Text>
        {result.series.map((series) => (
          <Text key={series.key} className="w-20 text-right font-semibold text-caption text-ink-2" numberOfLines={1}>
            {series.label}
          </Text>
        ))}
      </View>
      {result.buckets.slice(-14).map((bucket, offset) => {
        const index = result.buckets.length - Math.min(14, result.buckets.length) + offset;
        return (
          <View key={bucket.key} className="flex-row border-t border-line px-3 py-1.5">
            <Text className="flex-1 font-sans text-meta text-ink">{bucket.title}</Text>
            {result.series.map((series) => (
              <Text key={series.key} className="w-20 text-right font-sans text-meta text-ink">
                {formatReportValue(series.values[index] ?? null, series.unit, units)}
              </Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const MARKS = [0, 6, 12, 18];

function Heatmap({ result, units, rows: limit }: { result: ReportResult; units: Units; rows?: number }) {
  const series = result.series[0];
  const grid =
    result.grid && limit
      ? { ...result.grid, rows: result.grid.rows.slice(-limit), values: result.grid.values.slice(-limit) }
      : result.grid;
  const [active, setActive] = useState<{ row: number; col: number } | null>(null);
  if (!grid || !series) return null;
  const look = toneLook(series.tone);
  const shown = active ? grid.values[active.row]?.[active.col] : undefined;
  return (
    <View className="gap-1">
      <Text className="min-h-5 font-semibold text-caption text-ink">
        {active && shown !== undefined
          ? `${grid.rows[active.row]!.title}, ${grid.cols[active.col]}: ${formatReportValue(shown, series.unit, units)}`
          : ''}
      </Text>
      <View className="ml-11 h-4 flex-row">
        {MARKS.map((hour) => (
          <Text
            key={hour}
            className="absolute font-sans text-caption text-ink-3"
            style={{ left: `${(hour / 24) * 100}%` }}
          >
            {hourLabel(hour)}
          </Text>
        ))}
      </View>
      <View className="gap-px" accessibilityLabel={`${series.label} by hour of day, one row per day`}>
        {grid.rows.map((row, rowIndex) => (
          <View key={row.key} className="flex-row items-center gap-1">
            <Text className="w-10 font-sans text-caption text-ink-3" numberOfLines={1}>
              {rowIndex === 0 || rowIndex === grid.rows.length - 1 || rowIndex % 7 === 0
                ? row.title.replace(/^\w+ /, '')
                : ''}
            </Text>
            <View className="flex-1 flex-row gap-px">
              {grid.values[rowIndex]!.map((value, col) => (
                <Pressable
                  key={col}
                  onPress={() => setActive({ row: rowIndex, col })}
                  className={`h-3 flex-1 rounded-[2px] ${value > 0 ? look.className : 'bg-surface'}`}
                  style={value > 0 ? { opacity: heatIntensity(value, grid.max) * look.opacity } : undefined}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Histogram({ result, units }: { result: ReportResult; units: Units }) {
  const distribution = result.distribution;
  const series = result.series[0];
  const [active, setActive] = useState<number | null>(null);
  if (!distribution || !series) return null;
  const look = toneLook(series.tone);
  const max = Math.max(1, ...distribution.bins.map((bin) => bin.count));
  const bin = active === null ? null : distribution.bins[active];
  return (
    <View className="gap-1.5">
      <Readout lines={bin ? [`${bin.label}: ${bin.count}`] : []} />
      <View className="h-32 flex-row items-end gap-[2px] border-b border-line">
        {distribution.bins.map((item, index) => (
          <Pressable
            key={item.from}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.count}`}
            onPress={() => setActive(active === index ? null : index)}
            className={`h-full flex-1 flex-col-reverse ${active === index ? 'opacity-80' : ''}`}
          >
            <View
              className={`${look.className} rounded-t-sm`}
              style={{ height: `${(item.count / max) * 100}%`, opacity: look.opacity }}
            />
          </Pressable>
        ))}
      </View>
      <View className="flex-row justify-between">
        <Text className="font-sans text-caption text-ink-3">{formatReportValue(0, series.unit, units)}</Text>
        {distribution.median !== null && (
          <Text className="font-sans text-caption text-ink-3">
            Median {formatReportValue(distribution.median, series.unit, units)}
          </Text>
        )}
        <Text className="font-sans text-caption text-ink-3">
          {formatReportValue(distribution.bins.at(-1)?.to ?? 0, series.unit, units)}
        </Text>
      </View>
    </View>
  );
}

function Rhythm({ result, rows = 7 }: { result: ReportResult; rows?: number }) {
  const shown = result.rhythm?.slice(-rows) ?? [];
  return (
    <View className="gap-1">
      <View className="ml-11 h-4 flex-row">
        {MARKS.map((hour) => (
          <Text
            key={hour}
            className="absolute font-sans text-caption text-ink-3"
            style={{ left: `${(hour / 24) * 100}%` }}
          >
            {hourLabel(hour)}
          </Text>
        ))}
      </View>
      <View className="gap-1" accessibilityLabel="Sleep, feeds and nappies as blocks, one row per day">
        {shown.map((row) => (
          <View key={row.dayKey} className="flex-row items-center gap-1">
            <Text className="w-10 font-sans text-caption text-ink-3" numberOfLines={1}>
              {row.title.replace(/^\w+ /, '')}
            </Text>
            <View className="h-4 flex-1 overflow-hidden rounded-[3px] bg-surface">
              {row.blocks.map((block, index) => {
                const look = toneLook(block.tone);
                const instant = block.end <= block.start;
                return (
                  <View
                    key={`${block.eventId}-${index}`}
                    className={`absolute inset-y-0 ${look.className} ${instant ? 'w-0.5' : 'rounded-[2px]'}`}
                    style={{
                      left: `${block.start * 100}%`,
                      width: instant ? 2 : `${Math.max(0.4, (block.end - block.start) * 100)}%`,
                      opacity: look.opacity,
                    }}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ReportChart({
  result,
  units,
  compact = false,
}: {
  result: ReportResult;
  units: Units;
  compact?: boolean;
}) {
  switch (result.spec.chart) {
    case 'bar':
      return <Bars result={result} units={units} />;
    case 'line':
      return <Lines result={result} units={units} area={false} />;
    case 'area':
      return <Lines result={result} units={units} area />;
    case 'donut':
      return <Donut result={result} units={units} />;
    case 'number':
      return <Number result={result} units={units} />;
    case 'table':
      return <Table result={result} units={units} />;
    case 'heatmap':
      return <Heatmap result={result} units={units} rows={compact ? 7 : undefined} />;
    case 'histogram':
      return <Histogram result={result} units={units} />;
    case 'rhythm':
      return <Rhythm result={result} rows={compact ? 7 : 14} />;
  }
}
