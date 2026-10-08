import type { BabbleClient } from '@babble/api';
import type { BabyEvent, SleepDetails } from '@babble/domain';
import { useEffect, useRef, useState } from 'react';
import { TextAreaField } from '#/components/ui/field';
import { useSaveSleepDetails } from '#/lib/use-events';
import { SleepDetailFields } from './forms/sleep-form';

type Sleep = Extract<BabyEvent, { type: 'sleep' }>;

export function SleepDetailsEditor({ event, client, babyId }: { event: Sleep; client: BabbleClient; babyId: string }) {
  const save = useSaveSleepDetails(client, babyId);
  const [notes, setNotes] = useState(event.notes ?? '');
  const editingNotes = useRef(false);

  useEffect(() => {
    if (!editingNotes.current) setNotes(event.notes ?? '');
  }, [event.notes]);

  const saveDetails = (patch: Partial<SleepDetails>) => save.mutate({ eventId: event.id, changes: patch });

  return (
    <div className="flex flex-col gap-5">
      <SleepDetailFields details={event.details} onChange={saveDetails} />
      <TextAreaField
        label="Notes (optional)"
        value={notes}
        onFocus={() => (editingNotes.current = true)}
        onChange={(changeEvent) => setNotes(changeEvent.target.value)}
        onBlur={() => {
          editingNotes.current = false;
          const next = notes.trim() || null;
          if (next !== event.notes) save.mutate({ eventId: event.id, changes: { notes: next } });
        }}
      />
    </div>
  );
}
