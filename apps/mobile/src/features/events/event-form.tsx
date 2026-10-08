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
import { useState } from 'react';
import { CircleAlert, RotateCw } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';
import { useTokenColor } from '@/lib/theme';
import { useDeleteEvent, useSaveEvent } from '@/lib/use-events';
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
  const dangerColor = useTokenColor('--danger');
  const inkColor = useTokenColor('--ink');
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

  const common = { errors, timeZone, units, isNew };

  return (
    <View className="gap-6">
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
      <TextField
        label="Notes (optional)"
        multiline
        value={draft.notes ?? ''}
        onChangeText={(notes) => setDraft({ ...draft, notes: notes || null })}
      />
      {failure && (
        <View
          accessibilityRole="alert"
          className="flex-row items-center gap-3 rounded-tile border border-danger/35 bg-danger-soft py-1.5 pr-1.5 pl-4"
        >
          <CircleAlert size={20} color={dangerColor} strokeWidth={2.75} />
          <View className="flex-1 py-1.5">
            <Text className="font-sans text-meta text-on-danger">
              <Text className="font-bold text-on-danger">Couldn't save.</Text> Your entry is kept here.
            </Text>
            <Text className="font-sans text-meta text-on-danger opacity-80">{failure.message}</Text>
          </View>
          <Button
            variant="secondary"
            loading={save.isPending}
            icon={<RotateCw size={16} color={inkColor} strokeWidth={2.75} />}
            onPress={() => void attempt(failure.skipAmounts)}
          >
            Retry
          </Button>
        </View>
      )}
      {hasErrors(errors) && <StatusMessage tone="danger">Check the highlighted fields.</StatusMessage>}
      <Button size="lg" loading={save.isPending} disabled={needsChoice(draft)} onPress={() => void attempt(false)}>
        {save.isPending ? 'Saving…' : isNew ? 'Save' : 'Save changes'}
      </Button>
      {focusAmounts && draft.type === 'pump' && (
        <Button variant="ghost" size="lg" disabled={save.isPending} onPress={() => void attempt(true)}>
          Save without amounts
        </Button>
      )}
      {event && (
        <Button
          variant="ghost"
          loading={remove.isPending}
          onPress={() => {
            remove.mutate(event);
            onDone();
          }}
        >
          Delete
        </Button>
      )}
    </View>
  );
}
