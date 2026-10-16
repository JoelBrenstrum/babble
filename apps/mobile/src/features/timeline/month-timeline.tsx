import { weekdayLabel, TIMELINE_LANES, type DayLayout, type TimelineLane } from '@babble/domain';
import { Pressable, Text, View } from 'react-native';
import { pct } from './percent';

export function MonthTimeline({
  days,
  ticks,
  todayKey,
  onOpenDay,
  lanes = TIMELINE_LANES,
}: {
  days: { dayKey: string; layout: DayLayout | null }[];
  ticks: { frac: number; label: string }[];
  todayKey: string;
  onOpenDay: (dayKey: string) => void;
  lanes?: readonly TimelineLane[];
}) {
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-x-4 gap-y-1 pl-14">
        {lanes.includes('sleep') && <Legend swatch="h-2.5 w-2.5 rounded-sm bg-sleep" label="Sleep" />}
        {lanes.includes('feeds') && (
          <>
            <Legend swatch="h-2.5 w-0.5 rounded-full bg-feed-left" label="Left" />
            <Legend swatch="h-2.5 w-0.5 rounded-full bg-feed-right" label="Right" />
            <Legend swatch="h-2.5 w-0.5 rounded-full bg-bottle" label="Bottle" />
          </>
        )}
      </View>
      <View className="flex-row">
        <View className="w-14" />
        <View className="h-4 flex-1">
          {ticks.map((tick, index) => (
            <Text
              key={index}
              className="absolute top-0 font-sans text-caption text-ink-3"
              style={{
                left: pct(tick.frac),
                transform: [{ translateX: index === 0 ? 0 : index === ticks.length - 1 ? -14 : -7 }],
              }}
            >
              {tick.label}
            </Text>
          ))}
        </View>
      </View>
      <View className="gap-[3px]">
        {days.map(({ dayKey, layout }) => {
          const { weekday, day } = weekdayLabel(dayKey);
          const today = dayKey === todayKey;
          return (
            <Pressable
              key={dayKey}
              accessibilityRole="button"
              accessibilityLabel={`Open ${weekday} ${day}`}
              disabled={!layout}
              onPress={() => onOpenDay(dayKey)}
              className="h-4 flex-row items-center"
            >
              <Text
                className={`w-14 pr-2 font-sans text-caption ${today ? 'font-bold text-primary' : 'text-ink-3'}`}
                numberOfLines={1}
              >
                {`${weekday} ${day}`}
              </Text>
              <View
                className={`h-full flex-1 overflow-hidden rounded-sm bg-surface ${today ? 'border border-primary' : ''} ${layout ? '' : 'opacity-50'}`}
              >
                {ticks.slice(1, -1).map((tick, index) => (
                  <View
                    key={`tick-${index}`}
                    className="absolute bottom-0 top-0 w-px bg-line"
                    style={{ left: pct(tick.frac) }}
                  />
                ))}
                {layout?.sleep.map((item) => (
                  <View
                    key={item.event.id}
                    className="absolute bottom-0 top-0 bg-sleep"
                    style={{ left: pct(item.startFrac), width: pct(item.endFrac - item.startFrac), minWidth: 2 }}
                  />
                ))}
                {layout?.feeds.flatMap((item) =>
                  item.event.type === 'solids'
                    ? []
                    : item.parts.length > 0
                      ? item.parts.map((part, index) => (
                          <View
                            key={`${item.event.id}-${index}`}
                            className={`absolute bottom-[3px] top-[3px] rounded-full ${part.side === 'left' ? 'bg-feed-left' : 'bg-feed-right'}`}
                            style={{
                              left: pct(part.startFrac),
                              width: pct(part.endFrac - part.startFrac),
                              minWidth: 2,
                            }}
                          />
                        ))
                      : [
                          <View
                            key={item.event.id}
                            className={`absolute bottom-[3px] top-[3px] w-[2px] rounded-full ${item.event.type === 'bottle' ? 'bg-bottle' : 'bg-feed-right'}`}
                            style={{ left: pct(item.startFrac) }}
                          />,
                        ],
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={swatch} />
      <Text className="font-semibold text-meta text-ink-2">{label}</Text>
    </View>
  );
}
