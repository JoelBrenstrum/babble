import { latestMeta, TRACKERS, type BabyEvent, type Units } from '@babble/domain';
import { Text, View } from 'react-native';
import { Card } from '@/components/card';
import { TrackerIcon } from '@/components/tracker-icon';

export function ReadOnlyRunning({
  event,
  now,
  units,
  timeZone,
}: {
  event: BabyEvent;
  now: Date;
  units: Units;
  timeZone: string;
}) {
  const tracker = TRACKERS.find((candidate) => candidate.key === event.type);
  if (!tracker) return null;
  return (
    <Card className="flex-row items-center gap-4 px-4 py-3">
      <TrackerIcon tracker={tracker} />
      <View className="flex-1">
        <Text className="font-semibold text-row-title text-ink">{tracker.label}</Text>
        <Text numberOfLines={1} className="font-semibold text-meta text-primary">
          {latestMeta(event, now, units, timeZone)}
        </Text>
      </View>
    </Card>
  );
}
