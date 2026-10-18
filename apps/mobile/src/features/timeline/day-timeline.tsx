import {
  formatDuration,
  formatVolume,
  markerShiftPercent,
  nappyKind,
  partSpan,
  showsItemLabel,
  timelineItemLabel,
  timelineItemTip,
  type DayLayout,
  type TimelineLane,
  TIMELINE_LANES,
  type FeedDueMarker,
  type NightMarker,
  type PredictedItem,
  type TimelineItem,
  type Units,
  summariseSleep,
} from '@babble/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PooSwatch } from '@/components/poo-swatch';
import { sideStyle } from '@/lib/side-style';
import { pct } from './percent';

const DAY_TIMELINE_HEIGHT = 560;
const TIP_ROOM_FRAC = 0.15;

function open(item: TimelineItem) {
  router.push(item.running ? `/sessions/${item.event.id}` : `/events/${item.event.id}`);
}

export function DayTimeline({
  layout,
  ticks,
  timeZone,
  units,
  nowFrac,
  now,
  predicted = null,
  compact = false,
  feedDue = null,
  lanes: shown = TIMELINE_LANES,
  night = [],
}: {
  layout: DayLayout;
  ticks: { frac: number; label: string }[];
  timeZone: string;
  units: Units;
  nowFrac: number | null;
  now: Date;
  predicted?: { sleep: PredictedItem[]; feeds: PredictedItem[] } | null;
  compact?: boolean;
  feedDue?: FeedDueMarker | null;
  lanes?: readonly TimelineLane[];
  night?: NightMarker[];
}) {
  const filtered = shown.length < TIMELINE_LANES.length;
  const lanes: { key: keyof DayLayout; label: string }[] = [
    { key: 'sleep' as const, label: 'Sleep' },
    { key: 'feeds' as const, label: 'Feeds' },
    { key: 'nappies' as const, label: 'Nappy' },
    ...(layout.pumps.length || filtered ? [{ key: 'pumps' as const, label: 'Pump' }] : []),
  ].filter((lane) => shown.includes(lane.key));
  const [tip, setTip] = useState<TimelineItem | null>(null);
  const tipContent = tip ? timelineItemTip(tip.event, now, timeZone, units) : null;

  return (
    <View className="gap-2">
      {!compact && (
        <View className="flex-row gap-2 pl-9">
          {lanes.map((lane) => (
            <Text key={lane.key} className="flex-1 font-semibold text-meta text-ink-2">
              {lane.label}
            </Text>
          ))}
        </View>
      )}
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
          {night.map((marker) => (
            <View
              key={marker.frac}
              accessible
              accessibilityLabel={marker.label}
              testID="night-marker"
              className="absolute inset-x-0 border-t border-dashed border-sleep"
              style={{ top: pct(marker.frac) }}
            >
              {!compact && (
                <Text
                  className="absolute right-0 rounded-chip bg-sleep-soft px-1.5 font-semibold text-caption text-on-sleep"
                  style={{ top: 2 }}
                >
                  {marker.label}
                </Text>
              )}
            </View>
          ))}
          {feedDue && (
            <View
              accessible
              accessibilityLabel={feedDue.label}
              testID="feed-due-line"
              className={`absolute inset-x-0 z-10 border-t-2 border-dashed ${feedDue.overdue ? 'border-danger' : 'border-feed-left'}`}
              style={{ top: pct(feedDue.frac) }}
            >
              <Text
                className={`absolute right-0 rounded-chip px-1.5 font-semibold text-caption ${feedDue.overdue ? 'bg-danger-soft text-on-danger' : 'bg-feed-left-soft text-on-feed-left'}`}
                style={{ bottom: 2 }}
              >
                {feedDue.label}
              </Text>
            </View>
          )}
          {nowFrac !== null && (
            <View className="absolute inset-x-0 z-10 border-t-2 border-primary" style={{ top: pct(nowFrac) }} />
          )}
        </View>
        {lanes.map((lane) => (
          <View key={lane.key} className="flex-1">
            {layout[lane.key].map((item) => (
              <Item
                key={item.event.id}
                item={item}
                label={timelineItemLabel(item, timeZone, units)}
                units={units}
                now={now}
                onTip={() => setTip(item)}
              />
            ))}
            {(lane.key === 'sleep' ? predicted?.sleep : lane.key === 'feeds' ? predicted?.feeds : null)?.map((item) => (
              <Predicted key={item.startFrac} item={item} />
            ))}
          </View>
        ))}
        {tip && tipContent && (
          <View
            className="absolute left-9 right-0 z-20 items-center"
            style={tip.startFrac > TIP_ROOM_FRAC ? { bottom: pct(1 - tip.startFrac) } : { top: pct(tip.endFrac) }}
          >
            <Pressable
              testID="timeline-tip"
              accessibilityRole="button"
              accessibilityLabel={[tipContent.title, ...tipContent.lines].join('. ')}
              onPress={() => setTip(null)}
              className="my-1.5 max-w-[16rem] rounded-[10px] bg-ink px-2.5 py-1.5"
            >
              <Text className="font-bold text-caption text-bg">{tipContent.title}</Text>
              {tipContent.lines.map((line) => (
                <Text key={line} className="font-medium text-caption text-bg">
                  {line}
                </Text>
              ))}
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function Predicted({ item }: { item: PredictedItem }) {
  return (
    <View
      accessible
      accessibilityLabel={item.label}
      testID="predicted-block"
      className={`absolute inset-x-0 rounded-md border-2 border-dashed ${item.kind === 'sleep' ? 'border-sleep bg-sleep-soft' : 'border-feed-left bg-feed-left-soft'}`}
      style={{
        top: pct(item.startFrac),
        height: pct(item.endFrac - item.startFrac),
        minHeight: 4,
        opacity: item.opacity,
      }}
    />
  );
}

function Item({
  item,
  label,
  units,
  now,
  onTip,
}: {
  item: TimelineItem;
  label: string;
  units: Units;
  now: Date;
  onTip: () => void;
}) {
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
        onLongPress={onTip}
        className={`absolute inset-x-0 overflow-hidden px-1.5 py-0.5 ${item.parts.length > 0 ? 'border border-dashed border-sleep' : 'bg-sleep'}`}
        style={[span, corners]}
      >
        {item.parts.map((part, index) => {
          const { top, height: partHeight } = partSpan(item, part);
          return (
            <View
              key={index}
              className="absolute inset-x-0 bg-sleep"
              style={{ top: pct(top), height: pct(partHeight), minHeight: 2 }}
            />
          );
        })}
        {showsItemLabel(item) && (
          <Text className="font-bold text-caption text-ink-on-solid">
            {formatDuration(summariseSleep(event, now).asleepMs, { seconds: false })}
          </Text>
        )}
      </Pressable>
    );
  }

  if (event.type === 'breast_feed' || event.type === 'pump') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => open(item)}
        onLongPress={onTip}
        className={`absolute inset-x-0 overflow-hidden ${event.type === 'pump' ? 'bg-pump/40' : 'border border-dashed border-session-downtime'}`}
        style={[span, corners]}
      >
        {item.parts.map((part, index) => {
          const { top, height: partHeight } = partSpan(item, part);
          return (
            <View
              key={index}
              className={`absolute inset-x-0 ${event.type === 'pump' ? 'bg-pump' : sideStyle(part.side).solid}`}
              style={{ top: pct(top), height: pct(partHeight), minHeight: 3 }}
            />
          );
        })}
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
        onLongPress={onTip}
        className="absolute z-[1] h-5 justify-center rounded-chip border border-bottle/50 bg-bottle-soft px-1.5"
        style={marker}
      >
        <Text numberOfLines={1} className="font-bold text-caption text-on-bottle">
          {event.details.amountMl ? formatVolume(event.details.amountMl, units) : 'Bottle'}
        </Text>
      </Pressable>
    );
  }
  if (event.type === 'solids') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => open(item)}
        onLongPress={onTip}
        className="absolute z-[1] h-5 justify-center rounded-chip border border-solids/50 bg-solids-soft px-1.5"
        style={marker}
      >
        <Text numberOfLines={1} className="font-bold text-caption text-on-solids">
          {`${event.details.foods[0] ?? 'Solids'}${event.details.foods.length > 1 ? ` +${event.details.foods.length - 1}` : ''}`}
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
        onLongPress={onTip}
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
