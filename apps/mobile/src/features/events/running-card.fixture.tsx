import { sampleBaby, sampleFamily, sampleRunningFeed, sampleRunningSleep } from '@babble/api/fixtures';
import { applySessionAction, type BabyEvent } from '@babble/domain';
import { fixtureClient } from '@/fixtures/client';
import { RunningCard } from './running-card';

const now = new Date();
const feed = sampleRunningFeed(now);

function Card({ event }: { event: BabyEvent }) {
  return (
    <RunningCard event={event} client={fixtureClient} timeZone={sampleBaby.timezone} members={sampleFamily.members} />
  );
}

export default {
  Feeding: <Card event={feed} />,
  Paused: <Card event={applySessionAction(feed, { kind: 'pause' }, now)} />,
  Napping: <Card event={sampleRunningSleep(now)} />,
};
