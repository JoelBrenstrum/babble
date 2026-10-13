import {
  babySettingsQuery,
  queryKeys,
  updateBabySettings,
  updateFamilySettings,
  type BabbleClient,
  type BabySettings,
  type BabySettingsUpdate,
  type FamilySettings,
} from '@babble/api';
import { useAsyncAction } from '@babble/api/react';
import {
  feedReminderChoice,
  feedReminderOptions,
  feedReminderPatch,
  NAPPY_PROMPT_OPTIONS,
  type NappyPromptTiming,
  type Units,
} from '@babble/domain';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Card } from '#/components/ui/card';
import { SingleChips } from '#/components/ui/chips';
import { Segmented } from '#/components/ui/segmented';
import { StatusMessage } from '#/components/ui/status';
import { Stepper } from '#/components/ui/stepper';
import { MinutesTimeInput } from './minutes-time-input';

function useSettingsPanel(client: BabbleClient, babyId: string) {
  const queryClient = useQueryClient();
  const settings = useQuery(babySettingsQuery(client, babyId)).data;
  const { run, error } = useAsyncAction();
  const save = (task: (queryClient: QueryClient) => Promise<void>) => run(() => task(queryClient));
  return { settings, error, save };
}

function SettingsPanel({
  title,
  disabled,
  error,
  children,
}: {
  title: string;
  disabled: boolean;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-6 p-5">
      <h3 className="text-row-title font-semibold">{title}</h3>
      <fieldset disabled={disabled} className="flex flex-col gap-6 disabled:opacity-60">
        {children}
      </fieldset>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </Card>
  );
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
  const panel = useSettingsPanel(client, babyId);
  const { settings, error } = panel;

  const save = (patch: BabySettingsUpdate) =>
    panel.save(async (queryClient) => {
      queryClient.setQueryData(queryKeys.babySettings(babyId), await updateBabySettings(client, babyId, patch));
    });

  if (!settings) return null;

  return (
    <SettingsPanel title="Reminders and night" disabled={disabled} error={error}>
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
          options={NAPPY_PROMPT_OPTIONS}
          value={settings.nappy_prompt}
          allowNone={false}
          onChange={(nappy_prompt) => save({ nappy_prompt })}
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
            <MinutesTimeInput
              label="Night starts"
              minutes={settings.night_start_minutes}
              onChange={(night_start_minutes) => save({ night_start_minutes })}
            />
          </label>
          <label className="flex flex-col gap-1 text-meta text-ink-2">
            To
            <MinutesTimeInput
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
    </SettingsPanel>
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
  const panel = useSettingsPanel(client, babyId);
  const { settings, error } = panel;

  const save = (patch: Partial<FamilySettings>) =>
    panel.save(async (queryClient) => {
      await updateFamilySettings(client, familyId, patch);
      queryClient.setQueryData<BabySettings>(queryKeys.babySettings(babyId), (current) =>
        current ? { ...current, ...patch } : current,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.allBabySettings });
    });

  if (!settings) return null;

  return (
    <SettingsPanel title="Units and feeds" disabled={disabled} error={error}>
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
          required
          label="Ignore gaps shorter than"
          unit="sec"
          step={5}
          min={0}
          max={300}
          value={settings.downtime_merge_threshold_sec}
          onChange={(value) => save({ downtime_merge_threshold_sec: value })}
        />
        <p className="text-meta text-ink-2">
          Short pauses, like switching sides, won't show as downtime, and a side shorter than this is left out.
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Stepper
          required
          label="Finish paused feeds after"
          unit="min"
          step={5}
          min={5}
          max={240}
          value={settings.auto_end_paused_session_min}
          onChange={(value) => save({ auto_end_paused_session_min: value })}
        />
        <p className="text-meta text-ink-2">
          A paused feed or pump that's been left this long is finished automatically.
        </p>
      </div>
    </SettingsPanel>
  );
}
