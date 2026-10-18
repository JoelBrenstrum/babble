import type { BabbleClient } from '@babble/api';
import { usePumpAmountsDraft } from '@babble/api/react';
import type { EventOfType, Units } from '@babble/domain';
import { PumpAmountFields } from './forms/pump-form';

export function PumpAmountsEditor({
  event,
  client,
  babyId,
  units,
}: {
  event: EventOfType<'pump'>;
  client: BabbleClient;
  babyId: string;
  units: Units;
}) {
  const { details, change } = usePumpAmountsDraft(client, babyId, event);
  return <PumpAmountFields details={details} units={units} onChange={change} />;
}
