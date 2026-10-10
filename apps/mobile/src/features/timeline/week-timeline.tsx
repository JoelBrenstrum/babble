import { weekdayLabel, type DayLayout } from '@babble/domain';
import { Pressable, Text, View } from 'react-native';

const pct = (frac: number): `${number}%` => `${Math.round(frac * 100_000) / 1000}%`;

export function WeekTimeline({
  days,
  ticks,
  todayKey,
  onOpenDay,
}: {
  days: { dayKey: string; layout: DayLayout | null }[];
  ticks: { frac: number; label: string }[];
  todayKey: string;
  onOpenDay: (dayKey: string) => void;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-x-4 gap-y-1 pl-8">
        <Legend swatch="h-2.5 w-2.5 rounded-sm bg-sleep" label="Sleep" />
        <Legend swatch="h-1 w-2.5 rounded-full bg-feed-left" label="Left" />
        <Legend swatch="h-1 w-2.5 rounded-full bg-feed-right" label="Right" />
        <Legend swatch="h-1 w-2.5 rounded-full bg-bottle" label="Bottle" />
        <Legend swatch="h-2 w-2 rounded-full bg-nappy" label="Nappy" />
      </View>
      <View className="h-[420px] flex-row gap-1.5">
        <View className="w-6">
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
        {days.map(({ dayKey, layout }) => {
          const { weekday, day } = weekdayLabel(dayKey);
          return (
            <Pressable
              key={dayKey}
              accessibilityRole="button"
              accessibilityLabel={`Open ${weekday} ${day}`}
              disabled={!layout}
              onPress={() => onOpenDay(dayKey)}
              className={`flex-1 overflow-hidden rounded-tile bg-surface ${dayKey === todayKey ? 'border-2 border-primary' : ''} ${layout ? '' : 'opacity-50'}`}
            >
              {layout?.sleep.map((item) => (
                <View
                  key={item.event.id}
                  className="absolute inset-x-[3px] rounded-sm bg-sleep"
                  style={{ top: pct(item.startFrac), height: pct(item.endFrac - item.startFrac), minHeight: 2 }}
                />
              ))}
              {layout?.feeds.map((item) =>
                item.parts.length > 0 ? (
                  item.parts.map((part, index) => (
                    <View
                      key={`${item.event.id}-${index}`}
                      className={`absolute inset-x-[30%] rounded-full ${part.side === 'left' ? 'bg-feed-left' : 'bg-feed-right'}`}
                      style={{ top: pct(part.startFrac), height: pct(part.endFrac - part.startFrac), minHeight: 3 }}
                    />
                  ))
                ) : (
                  <View
                    key={item.event.id}
                    className={`absolute inset-x-[30%] h-[3px] rounded-full ${item.event.type === 'bottle' ? 'bg-bottle' : item.event.type === 'solids' ? 'bg-solids' : 'bg-feed-right'}`}
                    style={{ top: pct(item.startFrac) }}
                  />
                ),
              )}
              {layout?.nappies.map((item) => (
                <View
                  key={item.event.id}
                  className="absolute right-[3px] h-1.5 w-1.5 rounded-full bg-nappy"
                  style={{ top: pct(item.startFrac) }}
                />
              ))}
            </Pressable>
          );
        })}
      </View>
      <View className="flex-row gap-1.5 pl-[30px]">
        {days.map(({ dayKey }) => {
          const { weekday, day } = weekdayLabel(dayKey);
          return (
            <View key={dayKey} className="flex-1 items-center">
              <Text className={`font-bold text-label ${dayKey === todayKey ? 'text-primary' : 'text-ink'}`}>
                {weekday}
              </Text>
              <Text className="font-sans text-caption text-ink-3">{day}</Text>
            </View>
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
