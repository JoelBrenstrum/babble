import { babySettingsQuery, queryKeys, toBabbleError, updateBabySettings, type BabbleClient } from '@babble/api';
import { minutesToClock, type Units } from '@babble/domain';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Card, SectionLabel } from '@/components/card';
import { Segmented } from '@/components/segmented';
import { StatusMessage } from '@/components/status-message';
import { Stepper } from '@/components/stepper';

export function TrackingSettings({
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
  const [error, setError] = useState<string | null>(null);

  async function save(patch: Parameters<typeof updateBabySettings>[2]) {
    setError(null);
    try {
      const next = await updateBabySettings(client, babyId, patch);
      queryClient.setQueryData(queryKeys.babySettings(babyId), next);
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  }

  if (!settings) return null;

  return (
    <View className="gap-3">
      <SectionLabel>Tracking</SectionLabel>
      <Card className={`gap-6 p-5 ${disabled ? 'opacity-60' : ''}`} pointerEvents={disabled ? 'none' : 'auto'}>
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
            Short pauses, like switching sides, won't show as downtime.
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
            Sleep in this window counts as night sleep; the rest are naps.
          </Text>
        </View>
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      </Card>
    </View>
  );
}

function TimeButton({
  label,
  minutes,
  onChange,
}: {
  label: string;
  minutes: number;
  onChange: (minutes: number) => void;
}) {
  const [picking, setPicking] = useState(false);
  const asDate = new Date();
  asDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setPicking((current) => !current)}
        className="min-h-tap justify-center rounded-button border border-line-strong bg-raised px-4"
      >
        <Text className="font-semibold text-body text-ink">{minutesToClock(minutes)}</Text>
      </Pressable>
      {picking && (
        <DateTimePicker
          value={asDate}
          mode="time"
          minuteInterval={15}
          display="spinner"
          onChange={(event, date) => {
            if (Platform.OS === 'android' || event.type !== 'set') setPicking(false);
            if (event.type === 'set' && date) onChange(date.getHours() * 60 + date.getMinutes());
          }}
        />
      )}
    </View>
  );
}
