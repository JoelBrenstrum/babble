import { sampleBaby, sampleFamily } from '@babble/api/fixtures';
import { HomeOverview } from '#/features/home-overview';
import { FixtureRouter } from '#/fixtures/router';
import { AppShell } from './app-shell';

export default {
  Home: (
    <div className="-m-6">
      <FixtureRouter>
        <AppShell family={sampleFamily} baby={sampleBaby}>
          <HomeOverview baby={sampleBaby} />
        </AppShell>
      </FixtureRouter>
    </div>
  ),
};
