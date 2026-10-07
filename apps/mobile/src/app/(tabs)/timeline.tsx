import { History } from 'lucide-react-native';
import { Text } from 'react-native';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';

export default function TimelineTab() {
  return (
    <Screen edges={['top']}>
      <Text className="mb-6 font-bold text-title text-ink">Timeline</Text>
      <EmptyState
        icon={History}
        title="Nothing on the timeline yet"
        body="Daily and weekly timelines appear here once you start logging."
      />
    </Screen>
  );
}
