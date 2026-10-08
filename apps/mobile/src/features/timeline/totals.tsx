import { weekdayLabel, type StripItem, type TotalCard, type TotalKey, type WeekRow } from '@babble/domain';
import { Droplets, GlassWater, Heart, Moon, type LucideIcon } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';
import { Card } from '@/components/card';
import { PooSwatch } from '@/components/poo-swatch';
import { useTokenColor } from '@/lib/theme';

const TONES: Record<
  TotalKey,
  { icon: LucideIcon; tile: string; ink: '--on-sleep' | '--on-feed-right' | '--on-nappy' | '--on-pump' }
> = {
  sleep: { icon: Moon, tile: 'bg-sleep-soft', ink: '--on-sleep' },
  feeds: { icon: Heart, tile: 'bg-feed-right-soft', ink: '--on-feed-right' },
  nappies: { icon: Droplets, tile: 'bg-nappy-soft', ink: '--on-nappy' },
  pump: { icon: GlassWater, tile: 'bg-pump-soft', ink: '--on-pump' },
};

const ROW_DOT: Record<WeekRow['key'], string> = {
  sleep: 'bg-sleep',
  longest: 'bg-sleep',
  feeds: 'bg-feed-right',
  left: 'bg-feed-left',
  right: 'bg-feed-right',
  idle: 'border border-dashed border-session-downtime',
  bottle: 'bg-bottle',
  nappies: 'bg-nappy',
  pump: 'bg-pump',
};

export function SummaryStrip({ items }: { items: StripItem[] }) {
  return (
    <View className="flex-row rounded-card bg-surface py-2.5">
      {items.map((item, index) => (
        <View key={item.label} className={`flex-1 px-3 ${index ? 'border-l border-line' : ''}`}>
          <Text className="font-sans text-meta text-ink-2">{item.label}</Text>
          <View className="flex-row items-center gap-1.5">
            <Text className="font-bold text-heading text-ink">{item.value}</Text>
            {item.swatch && <PooSwatch colours={[item.swatch]} />}
          </View>
          {item.note && <Text className="font-sans text-caption text-ink-3">{item.note}</Text>}
        </View>
      ))}
    </View>
  );
}

export function DayTotals({ cards }: { cards: TotalCard[] }) {
  return (
    <View className="gap-3">
      {cards.map((card) => (
        <TotalCardView key={card.key} card={card} />
      ))}
    </View>
  );
}

function TotalCardView({ card }: { card: TotalCard }) {
  const tone = TONES[card.key];
  const color = useTokenColor(tone.ink);
  return (
    <Card className="gap-3 p-4">
      <View className="flex-row items-center gap-3">
        <View className={`h-9 w-9 items-center justify-center rounded-full ${tone.tile}`}>
          <tone.icon size={16} color={color} strokeWidth={2.75} />
        </View>
        <Text className="flex-1 font-semibold text-row-title text-ink">{card.label}</Text>
        <Text className="font-bold text-heading text-ink">{card.value}</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {card.details.map((detail) => (
          <View
            key={detail.label}
            className={`flex-1 rounded-tile bg-surface px-3 py-2 ${card.details.length === 4 ? 'min-w-[40%]' : ''}`}
          >
            <Text className="font-sans text-caption text-ink-2">{detail.label}</Text>
            <Text className="font-semibold text-label text-ink">{detail.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

export function WeekTable({ dayKeys, rows }: { dayKeys: string[]; rows: WeekRow[] }) {
  return (
    <Card className="p-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row pb-2">
            <Text className="w-36 font-semibold text-meta text-ink-2">Daily totals</Text>
            {dayKeys.map((key) => {
              const { weekday, day } = weekdayLabel(key);
              return (
                <Text key={key} className="w-16 text-right font-semibold text-meta text-ink-2">
                  {`${weekday} ${day}`}
                </Text>
              );
            })}
            <Text className="w-16 text-right font-semibold text-meta text-ink-2">Avg</Text>
          </View>
          {rows.map((row) => (
            <View key={row.key} className="flex-row items-center border-t border-line py-2">
              <View className="w-36 flex-row items-center gap-2">
                <View className={`h-2.5 w-2.5 rounded-sm ${ROW_DOT[row.key]}`} />
                <Text className="font-semibold text-label text-ink">{row.label}</Text>
              </View>
              {row.values.map((value, index) => (
                <Text key={index} className="w-16 text-right font-sans text-label text-ink-2">
                  {value ?? ''}
                </Text>
              ))}
              <Text className="w-16 text-right font-bold text-label text-ink">{row.average}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Card>
  );
}
