import { sampleBaby, sampleEvents, sampleFamily, sampleRunningFeed, sampleRunningSleep } from '@babble/api/fixtures';
import { RunningCard } from '#/features/events/running-card';
import { HomeOverview } from '#/features/home-overview';
import { fixtureClient } from '#/fixtures/client';
import { FixtureRouter } from '#/fixtures/router';
import { AppShell } from './app-shell';

const now = new Date();

function Home({ running }: { running: ReturnType<typeof sampleRunningFeed>[] }) {
  return (
    <div className="-m-6">
      <FixtureRouter>
        <AppShell family={sampleFamily} baby={sampleBaby}>
          <HomeOverview
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
        </AppShell>
      </FixtureRouter>
    </div>
  );
}

export default {
  'Home · feeding': <Home running={[sampleRunningFeed(now)]} />,
  'Home · napping': <Home running={[sampleRunningSleep(now)]} />,
  'Home · empty': (
    <div className="-m-6">
      <FixtureRouter>
        <AppShell family={sampleFamily} baby={sampleBaby}>
          <HomeOverview
            baby={sampleBaby}
            now={now}
            units="metric"
            running={[]}
            latest={[]}
            summary={null}
            renderRunning={() => null}
          />
        </AppShell>
      </FixtureRouter>
    </div>
  ),
};
