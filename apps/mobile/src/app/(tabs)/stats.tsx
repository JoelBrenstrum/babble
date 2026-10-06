import { ChartColumn } from 'lucide-react-native';
import { Text } from 'react-native';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';

export default function StatsTab() {
  return (
    <Screen edges={['top']}>
      <Text className="mb-6 font-bold text-title text-ink">Stats</Text>
      <EmptyState
        icon={ChartColumn}
        title="Insights are on the way"
        body="Trends for sleep, feeds and nappies will show up here in a later update."
      />
    </Screen>
  );
}
