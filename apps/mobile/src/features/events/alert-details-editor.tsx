import type { BabbleClient } from '@babble/api';
import { useSaveAlertDetails } from '@babble/api/react';
import type { BabyEvent } from '@babble/domain';
import { AlertActivityChips } from './forms/alert-form';

export function AlertDetailsEditor({
  event,
  client,
  babyId,
}: {
  event: Extract<BabyEvent, { type: 'alert' }>;
  client: BabbleClient;
  babyId: string;
}) {
  const save = useSaveAlertDetails(client, babyId);
  return (
    <AlertActivityChips
      value={event.details.activities}
      onChange={(activities) => save.mutate({ eventId: event.id, changes: { activities } })}
    />
  );
}
