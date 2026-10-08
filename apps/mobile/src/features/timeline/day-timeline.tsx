import {
  formatDuration,
  formatTimeOfDay,
  formatVolume,
  markerShiftPercent,
  nappyKind,
  type DayLayout,
  type TimelineItem,
  type Units,
  summariseSleep,
} from '@babble/domain';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { PooSwatch } from '@/components/poo-swatch';

const pct = (frac: number): `${number}%` => `${Math.round(frac * 100_000) / 1000}%`;
const LABEL_MIN_FRAC = 0.03;
export const DAY_TIMELINE_HEIGHT = 560;

function open(item: TimelineItem) {
  router.push(item.running ? `/sessions/${item.event.id}` : `/events/${item.event.id}`);
}

function itemLabel(item: TimelineItem, timeZone: string, units: Units): string {
  const { event } = item;
  const at = formatTimeOfDay(event.startedAt, timeZone);
  const length = event.endedAt
    ? formatDuration(Date.parse(event.endedAt) - Date.parse(event.startedAt), { seconds: false })
    : 'running';
  switch (event.type) {
    case 'sleep':
      return `Sleep ${at}, ${length}`;
    case 'breast_feed':
      return `Breastfeed ${at}, ${length}`;
    case 'pump':
      return `Pump ${at}, ${length}`;
    case 'bottle':
      return `Bottle ${at}${event.details.amountMl ? `, ${formatVolume(event.details.amountMl, units)}` : ''}`;
    case 'nappy':
      return `Nappy ${at}, ${nappyKind(event.details).toLowerCase()}`;
    default:
      return at;
  }
}

export function DayTimeline({
  layout,
  ticks,
  timeZone,
  units,
  nowFrac,
  now,
}: {
  layout: DayLayout;
  ticks: { frac: number; label: string }[];
  timeZone: string;
  units: Units;
  nowFrac: number | null;
  now: Date;
}) {
  const lanes: { key: keyof DayLayout; label: string }[] = [
    { key: 'sleep', label: 'Sleep' },
    { key: 'feeds', label: 'Feeds' },
    { key: 'nappies', label: 'Nappy' },
    ...(layout.pumps.length ? [{ key: 'pumps' as const, label: 'Pump' }] : []),
  ];

  return (
    <View className="gap-2">
      <View className="flex-row gap-2 pl-9">
        {lanes.map((lane) => (
          <Text key={lane.key} className="flex-1 font-semibold text-meta text-ink-2">
            {lane.label}
          </Text>
        ))}
      </View>
      <View className="flex-row gap-2" style={{ height: DAY_TIMELINE_HEIGHT }}>
        <View className="w-7">
          {ticks.map((tick, index) => (
            <Text
              key={index}
              className="absolute left-0 font-sans text-caption text-ink-3"
              style={{ top: pct(tick.frac), transform: [{ translateY: -7 }] }}
            >
              {tick.label}
            </Text>
          ))}
        </View>
        <View className="absolute bottom-0 left-9 right-0 top-0" pointerEvents="none">
          {ticks.map((tick, index) => (
            <View key={index} className="absolute inset-x-0 border-t border-line" style={{ top: pct(tick.frac) }} />
          ))}
          {nowFrac !== null && (
            <View className="absolute inset-x-0 z-10 border-t-2 border-primary" style={{ top: pct(nowFrac) }} />
          )}
        </View>
        {lanes.map((lane) => (
          <View key={lane.key} className="flex-1">
            {layout[lane.key].map((item) => (
              <Item key={item.event.id} item={item} label={itemLabel(item, timeZone, units)} units={units} now={now} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function Item({ item, label, units, now }: { item: TimelineItem; label: string; units: Units; now: Date }) {
  const { event } = item;
  const height = item.endFrac - item.startFrac;
  const span = { top: pct(item.startFrac), height: pct(height), minHeight: 4 };
  const corners = {
    borderTopLeftRadius: item.continuesBefore ? 0 : 6,
    borderTopRightRadius: item.continuesBefore ? 0 : 6,
    borderBottomLeftRadius: item.continuesAfter ? 0 : 6,
    borderBottomRightRadius: item.continuesAfter ? 0 : 6,
  };

  if (event.type === 'sleep') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => open(item)}
        className={`absolute inset-x-0 overflow-hidden px-1.5 py-0.5 ${item.parts.length > 0 ? 'border border-dashed border-sleep' : 'bg-sleep'}`}
        style={[span, corners]}
      >
        {item.parts.map((part, index) => (
          <View
            key={index}
            className="absolute inset-x-0 bg-sleep"
            style={{
              top: pct((part.startFrac - item.startFrac) / Math.max(height, 1e-6)),
              height: pct((part.endFrac - part.startFrac) / Math.max(height, 1e-6)),
              minHeight: 2,
            }}
          />
        ))}
        {height > LABEL_MIN_FRAC && (
          <Text className="font-bold text-caption text-ink-on-solid">
            {formatDuration(summariseSleep(event, now).asleepMs, { seconds: false })}
          </Text>
        )}
      </Pressable>
    );
  }

  if (event.type === 'breast_feed' || event.type === 'pump') {
    const total = Math.max(height, 1e-6);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => open(item)}
        className={`absolute inset-x-0 overflow-hidden ${event.type === 'pump' ? 'bg-pump/40' : 'border border-dashed border-session-downtime'}`}
        style={[span, corners]}
      >
        {item.parts.map((part, index) => (
          <View
            key={index}
            className={`absolute inset-x-0 ${event.type === 'pump' ? 'bg-pump' : part.side === 'left' ? 'bg-feed-left' : 'bg-feed-right'}`}
            style={{
              top: pct((part.startFrac - item.startFrac) / total),
              height: pct((part.endFrac - part.startFrac) / total),
              minHeight: 3,
            }}
          />
        ))}
      </Pressable>
    );
  }

  const marker = {
    top: pct(item.startFrac),
    left: `${markerShiftPercent(item.column)}%` as const,
    maxWidth: `${100 - markerShiftPercent(item.column)}%` as const,
    transform: [{ translateY: -10 }],
  };
  if (event.type === 'bottle') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => open(item)}
        className="absolute z-[1] h-5 justify-center rounded-chip border border-bottle/50 bg-bottle-soft px-1.5"
        style={marker}
      >
        <Text numberOfLines={1} className="font-bold text-caption text-on-bottle">
          {event.details.amountMl ? formatVolume(event.details.amountMl, units) : 'Bottle'}
        </Text>
      </Pressable>
    );
  }
  if (event.type === 'nappy') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => open(item)}
        className="absolute h-5 flex-row items-center gap-1 rounded-chip border border-nappy/50 bg-nappy-soft px-1.5"
        style={marker}
      >
        {event.details.dirty && event.details.pooColours.length > 0 && (
          <PooSwatch colours={event.details.pooColours} size={8} />
        )}
        <Text numberOfLines={1} className="font-bold text-caption text-on-nappy">
          {nappyKind(event.details)}
        </Text>
      </Pressable>
    );
  }
  return null;
}
