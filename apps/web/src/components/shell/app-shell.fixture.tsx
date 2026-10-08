import { babyChoices } from '@babble/api';
import { sampleBaby, sampleEvents, sampleFamily, sampleRunningFeed, sampleRunningSleep } from '@babble/api/fixtures';
import { runningIndicator } from '@babble/domain';
import { useState } from 'react';
import { RunningCard } from '#/features/events/running-card';
import { HomeOverview } from '#/features/home-overview';
import { fixtureClient } from '#/fixtures/client';
import { FixtureRouter } from '#/fixtures/router';
import { AppShell } from './app-shell';

const now = new Date();
const choices = babyChoices([sampleFamily]);

function Shell({
  children,
  running = [],
}: {
  children: React.ReactNode;
  running?: ReturnType<typeof sampleRunningFeed>[];
}) {
  const [babyId, setBabyId] = useState(sampleBaby.id);
  const baby = choices.find((choice) => choice.baby.id === babyId)!.baby;
  return (
    <AppShell
      family={sampleFamily}
      baby={baby}
      choices={choices}
      onSelectBaby={(choice) => setBabyId(choice.baby.id)}
      running={runningIndicator(running)}
    >
      {children}
    </AppShell>
  );
}

function Home({ running }: { running: ReturnType<typeof sampleRunningFeed>[] }) {
  return (
    <div className="-m-6">
      <FixtureRouter>
        <Shell running={running}>
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
        </Shell>
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
        <Shell>
          <HomeOverview
            baby={sampleBaby}
            now={now}
            units="metric"
            running={[]}
            latest={[]}
            summary={null}
            renderRunning={() => null}
          />
        </Shell>
      </FixtureRouter>
    </div>
  ),
};
