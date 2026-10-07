import { sampleBaby, sampleEvents } from '@babble/api/fixtures';
import { emptyDraft, type EventType } from '@babble/domain';
import { Card } from '@/components/card';
import { fixtureClient } from '@/fixtures/client';
import { EventForm, toDraft } from './event-form';

const now = new Date();
const nappy = sampleEvents(now).find((event) => event.type === 'nappy')!;

function NewForm({ type }: { type: EventType }) {
  return (
    <Card className="p-5">
      <EventForm
        client={fixtureClient}
        babyId={sampleBaby.id}
        timeZone={sampleBaby.timezone}
        units="metric"
        initial={emptyDraft(type, now)}
        onDone={() => undefined}
      />
    </Card>
  );
}

export default {
  Nappy: <NewForm type="nappy" />,
  'Nappy · editing': (
    <Card className="p-5">
      <EventForm
        client={fixtureClient}
        babyId={sampleBaby.id}
        timeZone={sampleBaby.timezone}
        units="metric"
        event={nappy}
        initial={toDraft(nappy)}
        onDone={() => undefined}
      />
    </Card>
  ),
  Bottle: <NewForm type="bottle" />,
  Sleep: <NewForm type="sleep" />,
  Breastfeed: <NewForm type="breast_feed" />,
  Pump: <NewForm type="pump" />,
  Growth: <NewForm type="growth" />,
  Custom: <NewForm type="custom" />,
};
