import { eventListQuery, toBabbleError, type BabbleClient } from '@babble/api';
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
import { CircleAlert, RotateCw, Trash2 } from 'lucide-react';
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
    endedBy: _eb,
    endRecordedAt: _er,
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
  onSaved,
  onDone,
}: {
  onSaved?: (draft: EventDraft) => void;
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
  const [failure, setFailure] = useState<{ message: string; skipAmounts: boolean } | null>(null);
  const save = useSaveEvent(client, babyId);
  const remove = useDeleteEvent(client, babyId);
  const isNew = !event;
  const growthEvents = useQuery({
    ...eventListQuery(client, babyId, ['growth']),
    enabled: draft.type === 'growth',
  }).data;

  async function attempt(skipAmounts: boolean) {
    const target = skipAmounts ? withoutPumpAmounts(draft) : draft;
    const found = validateDraft(target, new Date());
    setErrors(found);
    if (hasErrors(found)) return;
    setFailure(null);
    try {
      await save.mutateAsync({ draft: target, id: event?.id });
      onSaved?.(target);
      onDone();
    } catch (caught) {
      setFailure({ message: toBabbleError(caught).message, skipAmounts });
    }
  }

  function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    void attempt(false);
  }

  const common = { errors, timeZone, units, isNew };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {draft.type === 'sleep' && <SleepForm {...common} draft={draft} onChange={setDraft} />}
      {draft.type === 'breast_feed' && <BreastFeedForm {...common} draft={draft} onChange={setDraft} />}
      {draft.type === 'bottle' && <BottleForm {...common} draft={draft} onChange={setDraft} />}
      {draft.type === 'nappy' && <NappyForm {...common} draft={draft} onChange={setDraft} />}
      {draft.type === 'pump' && <PumpForm {...common} draft={draft} onChange={setDraft} amountsFirst={focusAmounts} />}
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
      {failure && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-tile border border-danger/35 bg-danger-soft py-1.5 pr-1.5 pl-4 text-on-danger"
        >
          <CircleAlert className="size-5 shrink-0 text-danger" strokeWidth={2.75} />
          <div className="flex min-w-0 flex-1 flex-col py-1.5 text-meta">
            <span>
              <strong>Couldn't save.</strong> Your entry is kept here.
            </span>
            <span className="break-words opacity-80">{failure.message}</span>
          </div>
          <Button
            variant="secondary"
            className="shrink-0"
            loading={save.isPending}
            onClick={() => void attempt(failure.skipAmounts)}
          >
            {!save.isPending && <RotateCw className="size-4" strokeWidth={2.75} />}
            Retry
          </Button>
        </div>
      )}
      {hasErrors(errors) && <StatusMessage tone="danger">Check the highlighted fields.</StatusMessage>}

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
            <Button variant="ghost" size="lg" disabled={save.isPending} onClick={() => void attempt(true)}>
              Save without amounts
            </Button>
          )}
          <Button type="submit" size="lg" loading={save.isPending} disabled={needsChoice(draft)}>
            {save.isPending ? 'Saving…' : isNew ? 'Save' : 'Save changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}
