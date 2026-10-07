import type { BabyChoice, BabyRow, Family } from '@babble/api';
import {
  formatAgo,
  formatDuration,
  formatShortDate,
  sinceReference,
  summariseLatest,
  TRACKERS,
  type BabyEvent,
  type DaySummary,
  type Units,
} from '@babble/domain';
import { Link } from 'expo-router';
import { Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BabyHeader } from '@/components/baby-header';
import { Card } from '@/components/card';
import { TrackerIcon } from '@/components/tracker-icon';
import { useTokenColor } from '@/lib/theme';

export function latestMeta(event: BabyEvent | undefined, now: Date, units: Units, timeZone: string): string {
  if (!event) return 'Nothing logged yet';
  if (event.endedAt === null && event.type !== 'bottle') return 'In progress';
  if (event.type === 'growth') {
    const [first] = summariseLatest(event, now, units).split(' · ');
    return `${first} · ${formatShortDate(event.startedAt, timeZone)}`;
  }
  const detail = summariseLatest(event, now, units);
  return `Last ${formatAgo(now.getTime() - Date.parse(sinceReference(event)))}${detail ? ` · ${detail}` : ''}`;
}

export function HomeOverview({
  family,
  baby,
  running,
  latest,
  summary,
  units,
  now,
  renderRunning,
  choices,
  onSelectBaby,
}: {
  choices?: readonly BabyChoice[];
  onSelectBaby?: (choice: BabyChoice) => void;
  family: Family;
  baby: BabyRow;
  running: BabyEvent[];
  latest: BabyEvent[];
  summary: Pick<DaySummary, 'sleepMs' | 'feeds' | 'nappies'> | null;
  units: Units;
  now: Date;
  renderRunning: (event: BabyEvent) => ReactNode;
}) {
  const iconColor = useTokenColor('--ink');
  return (
    <View className="gap-4">
      <BabyHeader family={family} baby={baby} choices={choices} onSelect={onSelectBaby} />
      {running.map((event) => (
        <View key={event.id}>{renderRunning(event)}</View>
      ))}
      <Card className="flex-row">
        {[
          ['Sleep today', summary ? formatDuration(summary.sleepMs, { seconds: false }) : '—'],
          ['Feeds', summary ? String(summary.feeds) : '—'],
          ['Nappies', summary ? String(summary.nappies) : '—'],
        ].map(([label, value], index) => (
          <View key={label} className={`flex-1 px-4 py-4 ${index > 0 ? 'border-l border-line' : ''}`}>
            <Text className="font-sans text-meta text-ink-2">{label}</Text>
            <Text className="font-bold text-heading text-ink">{value}</Text>
          </View>
        ))}
      </Card>
      <Card>
        {TRACKERS.map((tracker, index) => {
          const event = latest.find((item) => item.type === tracker.key);
          const live = event?.endedAt === null && tracker.key !== 'bottle';
          return (
            <View key={tracker.key} className={`flex-row items-center ${index > 0 ? 'border-t border-line' : ''}`}>
              <Link href={`/track/${tracker.key}`} asChild>
                <Pressable
                  accessibilityRole="link"
                  className="flex-1 flex-row items-center gap-4 px-4 py-3 active:bg-surface"
                >
                  <TrackerIcon tracker={tracker} />
                  <View className="flex-1">
                    <Text className="font-semibold text-row-title text-ink">{tracker.label}</Text>
                    <Text
                      numberOfLines={1}
                      className={live ? 'font-semibold text-meta text-primary' : 'font-sans text-meta text-ink-2'}
                    >
                      {latestMeta(event, now, units, baby.timezone)}
                    </Text>
                  </View>
                </Pressable>
              </Link>
              <Link href={`/track/${tracker.key}/new`} asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${tracker.label.toLowerCase()}`}
                  className="mr-3 size-tap items-center justify-center rounded-full border border-line bg-raised active:bg-surface"
                >
                  <Plus size={20} color={iconColor} strokeWidth={2.75} />
                </Pressable>
              </Link>
            </View>
          );
        })}
      </Card>
    </View>
  );
}
