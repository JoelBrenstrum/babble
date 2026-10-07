import { sampleBaby, sampleEvents, sampleFamily, sampleRunningFeed, sampleRunningSleep } from '@babble/api/fixtures';
import type { BabyEvent } from '@babble/domain';
import { fixtureClient } from '@/fixtures/client';
import { RunningCard } from './events/running-card';
import { HomeOverview } from './home-overview';

const now = new Date();

function Home({ running }: { running: BabyEvent[] }) {
  return (
    <HomeOverview
      family={sampleFamily}
      baby={sampleBaby}
      now={now}
      units="metric"
      running={running}
      latest={sampleEvents(now)}
      summary={{ sleepMs: 9 * 3_600_000 + 40 * 60_000, feeds: 7, nappies: 6 }}
      renderRunning={(event) => (
        <RunningCard
          event={event}
          client={fixtureClient}
          timeZone={sampleBaby.timezone}
          members={sampleFamily.members}
          compact
        />
      )}
    />
  );
}

export default {
  Feeding: <Home running={[sampleRunningFeed(now)]} />,
  Napping: <Home running={[sampleRunningSleep(now)]} />,
  Empty: (
    <HomeOverview
      family={sampleFamily}
      baby={sampleBaby}
      now={now}
      units="metric"
      running={[]}
      latest={[]}
      summary={null}
      renderRunning={() => null}
    />
  ),
};
