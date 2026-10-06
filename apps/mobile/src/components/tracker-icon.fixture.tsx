import { TRACKERS } from '@babble/domain';
import { History } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Avatar } from './avatar';
import { EmptyState } from './empty-state';
import { TrackerIcon } from './tracker-icon';

export default {
  Trackers: (
    <View className="gap-3">
      {TRACKERS.map((tracker) => (
        <View key={tracker.key} className="flex-row items-center gap-3">
          <TrackerIcon tracker={tracker} />
          <Text className="font-semibold text-row-title text-ink">{tracker.label}</Text>
        </View>
      ))}
    </View>
  ),
  Avatars: (
    <View className="flex-row gap-2">
      <Avatar name="John" />
      <Avatar name="Jane Smith" />
    </View>
  ),
  'Empty state': (
    <EmptyState
      icon={History}
      title="No history yet"
      body="Daily and weekly timelines appear here once you start logging."
    />
  ),
};
