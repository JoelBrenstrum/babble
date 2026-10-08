import { barReadout, chartDayLabel, chartValue, topSegment, type StatsCard } from '@babble/domain';
import { Droplets, GlassWater, Heart, Moon, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card } from '@/components/card';
import { PooSwatch } from '@/components/poo-swatch';
import { useTokenColor } from '@/lib/theme';

type InkToken = '--on-sleep' | '--on-feed-right' | '--on-nappy' | '--on-pump';

const LOOK: Record<StatsCard['key'], { icon: LucideIcon; tile: string; ink: InkToken; series: string[] }> = {
  sleep: { icon: Moon, tile: 'bg-sleep-soft', ink: '--on-sleep', series: ['bg-sleep', 'bg-sleep/45'] },
  feeds: { icon: Heart, tile: 'bg-feed-right-soft', ink: '--on-feed-right', series: ['bg-bottle', 'bg-feed-right'] },
  nappies: {
    icon: Droplets,
    tile: 'bg-nappy-soft',
    ink: '--on-nappy',
    series: ['bg-nappy/35', 'bg-nappy/65', 'bg-nappy'],
  },
  pump: { icon: GlassWater, tile: 'bg-pump-soft', ink: '--on-pump', series: ['bg-pump'] },
};

export function StatsCards({ cards }: { cards: StatsCard[] }) {
  return (
    <View className="gap-4">
      {cards.map((card) => (
        <StatsCardView key={card.key} card={card} />
      ))}
    </View>
  );
}

function StatsCardView({ card }: { card: StatsCard }) {
  const look = LOOK[card.key];
  const color = useTokenColor(look.ink);
  const { chart } = card;
  const [selected, setSelected] = useState<string | null>(null);
  const selectedBar = chart.bars.find((bar) => bar.label === selected);
  return (
    <Card className="gap-4 p-5">
      <View className="flex-row items-center gap-3">
        <View className={`h-9 w-9 items-center justify-center rounded-full ${look.tile}`}>
          <look.icon size={16} color={color} strokeWidth={2.75} />
        </View>
        <Text accessibilityRole="header" className="font-semibold text-row-title text-ink">
          {card.title}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {card.figures.map((figure) => (
          <View key={figure.label} className="min-w-[46%] flex-1 rounded-tile bg-surface px-3 py-2">
            <Text className="font-sans text-caption text-ink-2">{figure.label}</Text>
            <Text className="font-semibold text-label text-ink">{figure.value}</Text>
          </View>
        ))}
      </View>
      <View className="gap-1.5">
        <View className="flex-row items-center justify-between">
          <View className="flex-row gap-3">
            {chart.legend.map((index) => (
              <View key={index} className="flex-row items-center gap-1.5">
                <View className={`h-2.5 w-2.5 rounded-sm ${look.series[index]}`} />
                <Text className="font-sans text-caption text-ink-3">{chart.series[index]}</Text>
              </View>
            ))}
          </View>
          {chart.max > 0 && (
            <Text className="font-sans text-caption text-ink-3">
              {`${chart.weekly ? 'weekly avg, ' : ''}max ${chartValue(chart.max, chart.unit)}`}
            </Text>
          )}
        </View>
        <Text className={selectedBar ? 'font-semibold text-caption text-ink' : 'font-sans text-caption text-ink-3'}>
          {selectedBar ? barReadout(chart, selectedBar) : 'Tap a bar to see its day'}
        </Text>
        <View
          accessibilityLabel={`${card.title} per day`}
          className="h-32 flex-row items-end gap-[2px] border-b border-line"
        >
          {chart.bars.map((bar) => {
            const top = topSegment(bar.values);
            return (
              <Pressable
                key={bar.label}
                accessibilityRole="button"
                accessibilityLabel={barReadout(chart, bar)}
                accessibilityState={{ selected: selectedBar === bar }}
                onPress={() => setSelected(selectedBar === bar ? null : bar.label)}
                className={`h-full flex-1 flex-col-reverse ${selectedBar === bar ? 'opacity-80' : ''}`}
              >
                {bar.values.map((value, index) => (
                  <View
                    key={index}
                    className={`${look.series[index]} ${index === top ? 'rounded-t-sm' : ''}`}
                    style={{ height: chart.max ? `${(value / chart.max) * 100}%` : 0 }}
                  />
                ))}
                {top === -1 && <View className="h-px bg-line" />}
              </Pressable>
            );
          })}
        </View>
        {chart.bars.length > 0 && (
          <View className="flex-row justify-between">
            <Text className="font-sans text-caption text-ink-3">{chartDayLabel(chart.bars[0]!.label)}</Text>
            <Text className="font-sans text-caption text-ink-3">{chartDayLabel(chart.bars.at(-1)!.label)}</Text>
          </View>
        )}
      </View>
      {card.colours && card.colours.length > 0 && (
        <View className="gap-1.5">
          <Text className="font-sans text-caption text-ink-2">Recent poo colours, newest first</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {card.colours.map((colour, index) => (
              <PooSwatch key={index} colours={[colour]} size={20} />
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}
