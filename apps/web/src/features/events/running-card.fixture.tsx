import { sampleBaby, sampleFamily, sampleRunningFeed, sampleRunningSleep } from '@babble/api/fixtures';
import { applySessionAction } from '@babble/domain';
import { fixtureClient } from '#/fixtures/client';
import { FixtureRouter } from '#/fixtures/router';
import { RunningCard } from './running-card';

const now = new Date();
const feed = sampleRunningFeed(now);

function Card({ event }: { event: typeof feed }) {
  return (
    <FixtureRouter>
      <div className="mx-auto max-w-md">
        <RunningCard
          event={event}
          client={fixtureClient}
          timeZone={sampleBaby.timezone}
          members={sampleFamily.members}
        />
      </div>
    </FixtureRouter>
  );
}

export default {
  Feeding: <Card event={feed} />,
  Paused: <Card event={applySessionAction(feed, { kind: 'pause' }, now)} />,
  Napping: <Card event={sampleRunningSleep(now)} />,
};
