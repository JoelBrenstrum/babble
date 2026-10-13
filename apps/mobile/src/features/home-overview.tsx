import type { BabyChoice, BabyRow, Family } from '@babble/api';
import { formatDuration, latestMeta, TRACKERS, type BabyEvent, type DaySummary, type Units } from '@babble/domain';
import { Link } from 'expo-router';
import { AlarmClock, Moon, Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BabyHeader } from '@/components/baby-header';
import { Card } from '@/components/card';
import { TrackerIcon } from '@/components/tracker-icon';
import { PlusBadge } from '@/components/plus';
import { useTokenColor } from '@/lib/theme';

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
  feedDue = null,
  prediction = null,
  predictionPlus = false,
  addBabyLocked = false,
  canLog = true,
  canAddBaby = true,
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
  feedDue?: { text: string; overdue: boolean } | null;
  prediction?: string | null;
  predictionPlus?: boolean;
  addBabyLocked?: boolean;
  canLog?: boolean;
  canAddBaby?: boolean;
}) {
  const iconColor = useTokenColor('--ink');
  const dueColor = useTokenColor(feedDue?.overdue ? '--on-caution' : '--on-feed-right');
  return (
    <View className="gap-4">
      <BabyHeader
        family={family}
        baby={baby}
        choices={choices}
        onSelect={onSelectBaby}
        addBabyLocked={addBabyLocked}
        canAdd={canAddBaby}
      />
      {running.map((event) => (
        <View key={event.id}>{renderRunning(event)}</View>
      ))}
      {feedDue && (
        <View
          accessibilityRole="text"
          className={`flex-row items-center gap-3 rounded-card px-4 py-3 ${feedDue.overdue ? 'bg-caution-soft' : 'bg-feed-right-soft'}`}
        >
          <AlarmClock color={dueColor} size={20} strokeWidth={2.75} />
          <Text
            className={`flex-1 font-semibold text-body ${feedDue.overdue ? 'text-on-caution' : 'text-on-feed-right'}`}
          >
            {feedDue.text}
          </Text>
        </View>
      )}
      {prediction && <PredictionLine text={prediction} plus={predictionPlus} />}
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
              {canLog && (
                <Link href={`/track/${tracker.key}/new`} asChild>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${tracker.label.toLowerCase()}`}
                    className="mr-3 size-tap items-center justify-center rounded-full border border-line bg-raised active:bg-surface"
                  >
                    <Plus size={20} color={iconColor} strokeWidth={2.75} />
                  </Pressable>
                </Link>
              )}
            </View>
          );
        })}
      </Card>
    </View>
  );
}

export function PredictionLine({ text, plus = false }: { text: string; plus?: boolean }) {
  const color = useTokenColor('--on-sleep');
  return (
    <View className="flex-row items-center gap-3 rounded-card bg-sleep-soft px-4 py-3">
      <Moon color={color} size={20} strokeWidth={2.75} />
      <Text className="flex-1 font-semibold text-body text-on-sleep">{text}</Text>
      {plus && <PlusBadge />}
    </View>
  );
}
