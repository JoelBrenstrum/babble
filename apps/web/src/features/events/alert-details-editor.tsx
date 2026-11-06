import type { BabbleClient } from '@babble/api';
import { useSaveAlertDetails } from '@babble/api/react';
import type { EventOfType } from '@babble/domain';
import { AlertActivityChips } from './forms/alert-form';

export function AlertDetailsEditor({
  event,
  client,
  babyId,
}: {
  event: EventOfType<'alert'>;
  client: BabbleClient;
  babyId: string;
}) {
  const save = useSaveAlertDetails(client, babyId);
  return (
    <AlertActivityChips details={event.details} onChange={(changes) => save.mutate({ eventId: event.id, changes })} />
  );
}
