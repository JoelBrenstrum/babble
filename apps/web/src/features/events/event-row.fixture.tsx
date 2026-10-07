import { sampleBaby, sampleEvents, sampleFamily, sampleRunningFeed } from '@babble/api/fixtures';
import { Card } from '#/components/ui/card';
import { FixtureRouter } from '#/fixtures/router';
import { EventRow } from './event-row';

const now = new Date();

export default (
  <FixtureRouter>
    <Card className="mx-auto max-w-xl divide-y divide-line overflow-hidden">
      {[sampleRunningFeed(now), ...sampleEvents(now)].map((event) => (
        <EventRow
          key={event.id}
          event={event}
          members={sampleFamily.members}
          timeZone={sampleBaby.timezone}
          units="metric"
          now={now}
          showTitle
        />
      ))}
    </Card>
  </FixtureRouter>
);
