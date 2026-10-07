import { toBabbleError, type BabbleClient } from '@babble/api';
import {
  hasErrors,
  validateDraft,
  type BabyEvent,
  type DraftErrors,
  type EventDraft,
  type Units,
} from '@babble/domain';
import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '#/components/ui/button';
import { TextAreaField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';
import { useDeleteEvent, useSaveEvent } from '#/lib/use-events';
import { BottleForm } from './forms/bottle-form';
import { CustomForm } from './forms/custom-form';
import { GrowthForm } from './forms/growth-form';
import { NappyForm } from './forms/nappy-form';
import { PumpForm } from './forms/pump-form';
import { BreastFeedForm } from './forms/segment-form';
import { SleepForm } from './forms/sleep-form';

export function toDraft(event: BabyEvent): EventDraft {
  const {
    id: _id,
    babyId: _babyId,
    createdBy: _by,
    createdAt: _c,
    updatedAt: _u,
    deletedAt: _d,
    source: _s,
    sessionState: _st,
    ...draft
  } = event;
  return draft as EventDraft;
}

export function EventForm({
  client,
  babyId,
  timeZone,
  units,
  initial,
  event,
  focusAmounts = false,
  onDone,
}: {
  client: BabbleClient;
  babyId: string;
  timeZone: string;
  units: Units;
  initial: EventDraft;
  event?: BabyEvent;
  focusAmounts?: boolean;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<EventDraft>(initial);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const save = useSaveEvent(client, babyId);
  const remove = useDeleteEvent(client, babyId);
  const isNew = !event;

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    const found = validateDraft(draft, new Date());
    setErrors(found);
    if (hasErrors(found)) return;
    setServerError(null);
    try {
      await save.mutateAsync({ draft, id: event?.id });
      onDone();
    } catch (caught) {
      setServerError(toBabbleError(caught).message);
    }
  }

  const common = { errors, timeZone, units, isNew };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {draft.type === 'sleep' && <SleepForm {...common} draft={draft} onChange={setDraft} />}
      {draft.type === 'breast_feed' && <BreastFeedForm {...common} draft={draft} onChange={setDraft} />}
      {draft.type === 'bottle' && <BottleForm {...common} draft={draft} onChange={setDraft} />}
      {draft.type === 'nappy' && <NappyForm {...common} draft={draft} onChange={setDraft} />}
      {draft.type === 'pump' && <PumpForm {...common} draft={draft} onChange={setDraft} amountsFirst={focusAmounts} />}
      {draft.type === 'growth' && <GrowthForm {...common} draft={draft} onChange={setDraft} />}
      {draft.type === 'custom' && <CustomForm {...common} draft={draft} onChange={setDraft} />}

      <TextAreaField
        label="Notes (optional)"
        value={draft.notes ?? ''}
        onChange={(changeEvent) => setDraft({ ...draft, notes: changeEvent.target.value || null })}
      />
      {serverError && <StatusMessage tone="danger">{serverError}</StatusMessage>}
      {hasErrors(errors) && <StatusMessage tone="danger">Check the highlighted fields.</StatusMessage>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {event ? (
          <Button
            variant="ghost"
            className="text-danger"
            loading={remove.isPending}
            onClick={() => remove.mutate(event, { onSuccess: onDone })}
          >
            <Trash2 className="size-5" strokeWidth={2.75} />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" loading={save.isPending}>
          {save.isPending ? 'Saving…' : isNew ? 'Save' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
