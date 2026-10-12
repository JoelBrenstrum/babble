import {
  babySettingsQuery,
  queryKeys,
  toBabbleError,
  updateBabySettings,
  updateFamilySettings,
  type BabbleClient,
  type BabySettingsRow,
  type BabySettingsUpdate,
  type FamilySettings,
} from '@babble/api';
import {
  clockToMinutes,
  feedReminderChoice,
  feedReminderOptions,
  feedReminderPatch,
  NAPPY_PROMPT_LABELS,
  type NappyPromptTiming,
  type Units,
} from '@babble/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Card } from '#/components/ui/card';
import { SingleChips } from '#/components/ui/chips';
import { Segmented } from '#/components/ui/segmented';
import { StatusMessage } from '#/components/ui/status';
import { Stepper } from '#/components/ui/stepper';
import { showNativePicker } from '#/lib/native-picker';

function useSaveError() {
  const [error, setError] = useState<string | null>(null);
  async function attempt(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  }
  return { error, attempt };
}

export function BabyTrackingSettings({
  client,
  babyId,
  disabled,
}: {
  client: BabbleClient;
  babyId: string;
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  const { error, attempt } = useSaveError();

  const save = (patch: BabySettingsUpdate) =>
    attempt(async () => {
      queryClient.setQueryData(queryKeys.babySettings(babyId), await updateBabySettings(client, babyId, patch));
    });

  if (!settings) return null;

  return (
    <Card className="flex flex-col gap-6 p-5">
      <h3 className="text-row-title font-semibold">Reminders and night</h3>
      <fieldset disabled={disabled} className="flex flex-col gap-6 disabled:opacity-60">
        <div className="flex flex-col gap-1">
          <SingleChips
            label="Feed reminders"
            options={feedReminderOptions(settings)}
            value={feedReminderChoice(settings)}
            allowNone={false}
            onChange={(choice) => save(feedReminderPatch(choice))}
          />
          <p className="text-meta text-ink-2">
            Home shows when the next feed is due, counted from the start of the last feed.
          </p>
        </div>
        {settings.feed_reminder_enabled && (
          <div className="flex flex-col gap-2">
            <span className="text-label font-semibold">At night</span>
            <Segmented<'remind' | 'quiet'>
              label="Feed reminders at night"
              value={settings.feed_reminder_at_night ? 'remind' : 'quiet'}
              onChange={(choice) => save({ feed_reminder_at_night: choice === 'remind' })}
              options={[
                { value: 'remind', label: 'Remind' },
                { value: 'quiet', label: 'Quiet' },
              ]}
            />
            <p className="text-meta text-ink-2">Quiet hides feed reminders during the night set below.</p>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <SingleChips<NappyPromptTiming>
            label="Ask about a nappy"
            options={(Object.keys(NAPPY_PROMPT_LABELS) as NappyPromptTiming[]).map((value) => ({
              value,
              label: NAPPY_PROMPT_LABELS[value],
            }))}
            value={settings.nappy_prompt}
            allowNone={false}
            onChange={(nappy_prompt) => nappy_prompt && save({ nappy_prompt })}
          />
          <p className="text-meta text-ink-2">
            When to ask about a nappy change during a breastfeed. Bottles ask after saving.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-label font-semibold">Night</span>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-meta text-ink-2">
              From
              <TimeInput
                label="Night starts"
                minutes={settings.night_start_minutes}
                onChange={(night_start_minutes) => save({ night_start_minutes })}
              />
            </label>
            <label className="flex flex-col gap-1 text-meta text-ink-2">
              To
              <TimeInput
                label="Night ends"
                minutes={settings.night_end_minutes}
                onChange={(night_end_minutes) => save({ night_end_minutes })}
              />
            </label>
          </div>
          <p className="text-meta text-ink-2">
            Sleep in this window counts as night sleep; the rest are naps. Dark at night follows it too.
          </p>
        </div>
      </fieldset>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </Card>
  );
}

export function FamilyTrackingSettings({
  client,
  familyId,
  babyId,
  disabled,
}: {
  client: BabbleClient;
  familyId: string;
  babyId: string;
  disabled: boolean;
}) {
  const queryClient = useQueryClient();
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  const { error, attempt } = useSaveError();

  const save = (patch: Partial<FamilySettings>) =>
    attempt(async () => {
      await updateFamilySettings(client, familyId, patch);
      queryClient.setQueryData<BabySettingsRow>(queryKeys.babySettings(babyId), (current) =>
        current ? { ...current, ...patch } : current,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.allBabySettings });
    });

  if (!settings) return null;

  return (
    <Card className="flex flex-col gap-6 p-5">
      <h3 className="text-row-title font-semibold">Units and feeds</h3>
      <fieldset disabled={disabled} className="flex flex-col gap-6 disabled:opacity-60">
        <div className="flex flex-col gap-2">
          <span className="text-label font-semibold">Units</span>
          <Segmented<Units>
            label="Units"
            value={settings.units}
            onChange={(units) => save({ units })}
            options={[
              { value: 'metric', label: 'Metric (ml, kg, cm)' },
              { value: 'imperial', label: 'Imperial (oz, lb, in)' },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Stepper
            label="Ignore gaps shorter than"
            unit="sec"
            step={5}
            min={0}
            max={300}
            value={settings.downtime_merge_threshold_sec}
            onChange={(value) => value !== null && save({ downtime_merge_threshold_sec: value })}
          />
          <p className="text-meta text-ink-2">
            Short pauses, like switching sides, won't show as downtime, and a side shorter than this is left out.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <Stepper
            label="Finish paused feeds after"
            unit="min"
            step={5}
            min={5}
            max={240}
            value={settings.auto_end_paused_session_min}
            onChange={(value) => value !== null && save({ auto_end_paused_session_min: value })}
          />
          <p className="text-meta text-ink-2">
            A paused feed or pump that's been left this long is finished automatically.
          </p>
        </div>
      </fieldset>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </Card>
  );
}

function TimeInput({
  label,
  minutes,
  onChange,
}: {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const value = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return (
    <input
      type="time"
      onClick={(event) => showNativePicker(event.currentTarget)}
      aria-label={label}
      step={900}
      className="h-tap rounded-button border border-line-strong bg-raised px-3 text-body text-ink"
      defaultValue={value}
      key={value}
      onBlur={(event) => {
        const next = clockToMinutes(event.target.value);
        if (next !== null && next !== minutes) onChange(next);
      }}
    />
  );
}
