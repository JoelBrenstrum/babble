import { clock, eventListQuery, type BabbleClient } from '@babble/api';
import { useAsyncAction, useDeleteEvent, useSaveEvent } from '@babble/api/react';
import { useQuery } from '@tanstack/react-query';
import {
  growthPlaceholders,
  hasErrors,
  needsChoice,
  validateDraft,
  withoutPumpAmounts,
  type BabyEvent,
  type DraftErrors,
  type EventDraft,
  type Units,
} from '@babble/domain';
import { RotateCw, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '#/components/ui/button';
import { TextAreaField } from '#/components/ui/field';
import { StatusMessage } from '#/components/ui/status';
import { BottleForm } from './forms/bottle-form';
import { CustomForm } from './forms/custom-form';
import { GrowthForm } from './forms/growth-form';
import { NappyForm } from './forms/nappy-form';
import { PumpForm } from './forms/pump-form';
import { BreastFeedForm } from './forms/segment-form';
import { SleepForm } from './forms/sleep-form';
import { SolidsForm } from './forms/solids-form';

export function EventForm({
  client,
  babyId,
  timeZone,
  units,
  initial,
  event,
  focusAmounts = false,
  readOnly = false,
  onSaved,
  onDone,
}: {
  client: BabbleClient;
  babyId: string;
  timeZone: string;
  units: Units;
  initial: EventDraft;
  event?: BabyEvent;
  focusAmounts?: boolean;
  readOnly?: boolean;
  onSaved?: (draft: EventDraft) => void;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<EventDraft>(initial);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [retryWithoutAmounts, setRetryWithoutAmounts] = useState(false);
  const saving = useAsyncAction();
  const save = useSaveEvent(client, babyId);
  const remove = useDeleteEvent(client, babyId);
  const isNew = !event;
  const growthEvents = useQuery({
    ...eventListQuery(client, babyId, ['growth']),
    enabled: draft.type === 'growth',
  }).data;
  const solidsEvents = useQuery({
    ...eventListQuery(client, babyId, ['solids']),
    enabled: draft.type === 'solids',
  }).data;

  async function attempt(skipAmounts: boolean) {
    const target = skipAmounts ? withoutPumpAmounts(draft) : draft;
    const found = validateDraft(target, clock.now());
    setErrors(found);
    if (hasErrors(found)) return;
    setRetryWithoutAmounts(skipAmounts);
    const saved = await saving.run(() => save.mutateAsync({ draft: target, id: event?.id }));
    if (!saved) return;
    onSaved?.(target);
    onDone();
  }

  function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    void attempt(false);
  }

  const common = { errors, timeZone, units, isNew };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-6">
        {draft.type === 'sleep' && <SleepForm {...common} draft={draft} onChange={setDraft} />}
        {draft.type === 'breast_feed' && <BreastFeedForm {...common} draft={draft} onChange={setDraft} />}
        {draft.type === 'bottle' && <BottleForm {...common} draft={draft} onChange={setDraft} />}
        {draft.type === 'solids' && (
          <SolidsForm {...common} draft={draft} onChange={setDraft} history={solidsEvents ?? []} eventId={event?.id} />
        )}
        {draft.type === 'nappy' && <NappyForm {...common} draft={draft} onChange={setDraft} />}
        {draft.type === 'pump' && (
          <PumpForm {...common} draft={draft} onChange={setDraft} amountsFirst={focusAmounts} />
        )}
        {draft.type === 'growth' && (
          <GrowthForm
            {...common}
            draft={draft}
            onChange={setDraft}
            previous={growthPlaceholders(growthEvents ?? [], units, timeZone, event?.id)}
          />
        )}
        {draft.type === 'custom' && <CustomForm {...common} draft={draft} onChange={setDraft} />}

        <TextAreaField
          label="Notes (optional)"
          value={draft.notes ?? ''}
          onChange={(changeEvent) => setDraft({ ...draft, notes: changeEvent.target.value || null })}
        />
      </fieldset>
      {saving.error && (
        <StatusMessage
          tone="danger"
          action={
            <Button
              variant="secondary"
              className="shrink-0"
              loading={saving.busy}
              onClick={() => void attempt(retryWithoutAmounts)}
            >
              {!saving.busy && <RotateCw className="size-4" strokeWidth={2.75} />}
              Retry
            </Button>
          }
        >
          <strong>Couldn't save.</strong> Your entry is kept here.
          <span className="block break-words opacity-80">{saving.error}</span>
        </StatusMessage>
      )}
      {hasErrors(errors) && <StatusMessage tone="danger">Check the highlighted fields.</StatusMessage>}

      {!readOnly && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {event ? (
            <Button
              variant="ghost"
              className="text-danger"
              loading={remove.isPending}
              onClick={() => {
                remove.mutate(event);
                onDone();
              }}
            >
              <Trash2 className="size-5" strokeWidth={2.75} />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {focusAmounts && draft.type === 'pump' && (
              <Button variant="ghost" size="lg" disabled={saving.busy} onClick={() => void attempt(true)}>
                Save without amounts
              </Button>
            )}
            <Button type="submit" size="lg" loading={saving.busy} disabled={needsChoice(draft)}>
              {saving.busy ? 'Saving…' : isNew ? 'Save' : 'Save changes'}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
