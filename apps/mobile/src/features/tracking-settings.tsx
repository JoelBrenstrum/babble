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
  type Units,
  NAPPY_PROMPT_LABELS,
  type NappyPromptTiming,
} from '@babble/domain';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { Card } from '@/components/card';
import { SingleChips } from '@/components/chips';
import { Segmented } from '@/components/segmented';
import { StatusMessage } from '@/components/status-message';
import { Stepper } from '@/components/stepper';
import { TimeButton } from '@/components/time-button';

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
  const { error, run } = useAsyncAction();

  const save = (patch: BabySettingsUpdate) =>
    run(async () => {
      queryClient.setQueryData(queryKeys.babySettings(babyId), await updateBabySettings(client, babyId, patch));
      if (patch.night_end_minutes !== undefined)
        await queryClient.invalidateQueries({ queryKey: queryKeys.families, refetchType: 'all' });
    });

  if (!settings) return null;

  return (
    <Card className={`gap-6 p-5 ${disabled ? 'opacity-60' : ''}`} pointerEvents={disabled ? 'none' : 'auto'}>
      <Text className="font-semibold text-row-title text-ink">Reminders and night</Text>
      <View className="gap-1">
        <SingleChips
          label="Feed reminders"
          options={feedReminderOptions(settings)}
          value={feedReminderChoice(settings)}
          onChange={(choice) => choice !== null && save(feedReminderPatch(choice))}
        />
        <Text className="font-sans text-meta text-ink-2">
          Home shows when the next feed is due, counted from the start of the last feed.
        </Text>
      </View>
      {settings.feed_reminder_enabled && (
        <View className="gap-2">
          <Text className="font-semibold text-label text-ink">At night</Text>
          <Segmented<'remind' | 'quiet'>
            value={settings.feed_reminder_at_night ? 'remind' : 'quiet'}
            onChange={(choice) => save({ feed_reminder_at_night: choice === 'remind' })}
            options={[
              { value: 'remind', label: 'Remind' },
              { value: 'quiet', label: 'Quiet' },
            ]}
          />
          <Text className="font-sans text-meta text-ink-2">Quiet hides feed reminders during the night set below.</Text>
        </View>
      )}
      <View className="gap-1">
        <SingleChips<NappyPromptTiming>
          label="Ask about a nappy"
          options={(Object.keys(NAPPY_PROMPT_LABELS) as NappyPromptTiming[]).map((value) => ({
            value,
            label: NAPPY_PROMPT_LABELS[value],
          }))}
          value={settings.nappy_prompt}
          onChange={(nappy_prompt) => nappy_prompt !== null && save({ nappy_prompt })}
        />
        <Text className="font-sans text-meta text-ink-2">
          When to ask about a nappy change during a breastfeed. Bottles ask after saving.
        </Text>
      </View>
      <View className="gap-2">
        <Text className="font-semibold text-label text-ink">Night</Text>
        <View className="flex-row items-center gap-3">
          <Text className="font-sans text-meta text-ink-2">From</Text>
          <TimeButton
            label="Night starts"
            minutes={settings.night_start_minutes}
            onChange={(night_start_minutes) => save({ night_start_minutes })}
          />
          <Text className="font-sans text-meta text-ink-2">to</Text>
          <TimeButton
            label="Night ends"
            minutes={settings.night_end_minutes}
            onChange={(night_end_minutes) => save({ night_end_minutes })}
          />
        </View>
        <Text className="font-sans text-meta text-ink-2">
          Sleep in this window counts as night sleep; the rest are naps. Dark at night follows it too, and so does the
          start of the day if it begins when the night ends.
        </Text>
      </View>
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
  const { error, run } = useAsyncAction();

  const save = (patch: Partial<FamilySettings>) =>
    run(async () => {
      await updateFamilySettings(client, familyId, patch);
      queryClient.setQueryData<BabySettings>(queryKeys.babySettings(babyId), (current) =>
        current ? { ...current, ...patch } : current,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.allBabySettings });
    });

  if (!settings) return null;

  return (
    <Card className={`gap-6 p-5 ${disabled ? 'opacity-60' : ''}`} pointerEvents={disabled ? 'none' : 'auto'}>
      <Text className="font-semibold text-row-title text-ink">Units and feeds</Text>
      <View className="gap-2">
        <Text className="font-semibold text-label text-ink">Units</Text>
        <Segmented<Units>
          value={settings.units}
          onChange={(units) => save({ units })}
          options={[
            { value: 'metric', label: 'Metric' },
            { value: 'imperial', label: 'Imperial' },
          ]}
        />
      </View>
      <View className="gap-1">
        <Stepper
          label="Ignore gaps shorter than"
          unit="sec"
          step={5}
          min={0}
          max={300}
          value={settings.downtime_merge_threshold_sec}
          onChange={(value) => value !== null && save({ downtime_merge_threshold_sec: value })}
        />
        <Text className="font-sans text-meta text-ink-2">
          Short pauses, like switching sides, won't show as downtime, and a side shorter than this is left out.
        </Text>
      </View>
      <View className="gap-1">
        <Stepper
          label="Finish paused feeds after"
          unit="min"
          step={5}
          min={5}
          max={240}
          value={settings.auto_end_paused_session_min}
          onChange={(value) => value !== null && save({ auto_end_paused_session_min: value })}
        />
        <Text className="font-sans text-meta text-ink-2">
          A paused feed or pump left this long is finished automatically.
        </Text>
      </View>
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </Card>
  );
}
