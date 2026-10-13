import { FeedRunningCard } from './feed-running-card';
import type { RunningCardProps } from './running-card-shell';
import { SleepRunningCard } from './sleep-running-card';

export function RunningCard(props: RunningCardProps) {
  const { event } = props;
  if (event.type === 'sleep') return <SleepRunningCard {...props} event={event} />;
  if (event.type === 'breast_feed' || event.type === 'pump') return <FeedRunningCard {...props} event={event} />;
  return null;
}
