import {
  awakePeriods,
  napDurationText,
  newAwakePeriod,
  stretchesWithAwake,
  trimAwakePeriod,
  type AwakePeriod,
  type DraftOfType,
  type FallAsleep,
  type Mood,
  type SleepDetails,
  type SleepLocation,
} from '@babble/domain';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CheckRow, MultiChips, SingleChips } from '@/components/chips';
import { DateTimeField } from '@/components/datetime-field';
import { useTokenColor } from '@/lib/theme';
import { NapBreakdown } from '../nap-breakdown';
import { FormSection, type FormProps } from './shared';

const LOCATIONS: { value: SleepLocation; label: string }[] = [
  { value: 'cot', label: 'Cot' },
  { value: 'bassinet', label: 'Bassinet' },
  { value: 'pram', label: 'Pram' },
  { value: 'car', label: 'Car' },
  { value: 'swing', label: 'Swing' },
  { value: 'held', label: 'Held' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'co_sleep', label: 'Co-sleep' },
  { value: 'next_to_carer', label: 'Next to carer' },
];
const FALL_ASLEEP: { value: FallAsleep; label: string }[] = [
  { value: 'under_10_min', label: 'Under 10 min' },
  { value: '10_to_20_min', label: '10–20 min' },
  { value: 'long_time', label: 'Took a while' },
];
const MOODS: { value: Mood; label: string }[] = [
  { value: 'happy', label: 'Happy' },
  { value: 'upset', label: 'Upset' },
];

export function SleepDetailFields({
  details,
  onChange,
}: {
  details: SleepDetails;
  onChange: (patch: Partial<SleepDetails>) => void;
}) {
  return (
    <>
      <MultiChips
        label="Where"
        options={LOCATIONS}
        value={details.locations}
        onChange={(locations) => onChange({ locations })}
      />
      <SingleChips
        label="Fell asleep in"
        options={FALL_ASLEEP}
        value={details.fallAsleep}
        onChange={(fallAsleep) => onChange({ fallAsleep })}
      />
      <MultiChips
        label="Mood going down"
        options={MOODS}
        value={details.startMoods}
        onChange={(startMoods) => onChange({ startMoods })}
      />
      <MultiChips
        label="Mood on waking"
        options={MOODS}
        value={details.endMoods}
        onChange={(endMoods) => onChange({ endMoods })}
      />
      <CheckRow
        label="Woken by a carer"
        value={details.wokenByCarer}
        onChange={(wokenByCarer) => onChange({ wokenByCarer })}
      />
    </>
  );
}

export function SleepForm({ draft, onChange, errors, timeZone }: FormProps<DraftOfType<'sleep'>>) {
  const details = draft.details;
  const endedAt = draft.endedAt ?? draft.startedAt;
  const [periods, setPeriods] = useState<AwakePeriod[]>(() => awakePeriods(draft.segments, draft.startedAt, endedAt));
  const duration = napDurationText(draft.startedAt, draft.endedAt, periods);
  const ink = useTokenColor('--ink');

  function update(next: { startedAt?: string; endedAt?: string; periods?: AwakePeriod[] }) {
    const startedAt = next.startedAt ?? draft.startedAt;
    const end = next.endedAt ?? endedAt;
    const nextPeriods = next.periods ?? periods;
    if (next.periods) setPeriods(next.periods);
    onChange({ ...draft, startedAt, endedAt: end, segments: stretchesWithAwake(startedAt, end, nextPeriods) });
  }

  return (
    <FormSection>
      <DateTimeField
        label="Fell asleep"
        timeZone={timeZone}
        value={draft.startedAt}
        error={errors.startedAt}
        onChange={(startedAt) => update({ startedAt })}
      />
      <DateTimeField
        label="Woke up"
        timeZone={timeZone}
        value={endedAt}
        error={errors.endedAt}
        onChange={(value) => update({ endedAt: value })}
      />
      <View className="gap-3">
        <Text className="font-semibold text-label text-ink">Wake-ups</Text>
        {periods.length > 0 && (
          <NapBreakdown
            nap={{
              startedAt: draft.startedAt,
              endedAt,
              segments: stretchesWithAwake(draft.startedAt, endedAt, periods),
            }}
            now={new Date(endedAt)}
            trim="all"
            onTrimAwake={(index) => update({ periods: trimAwakePeriod(periods, index) })}
            onRemoveAwake={(index) => update({ periods: periods.filter((_, i) => i !== index) })}
          />
        )}
        {errors.awake && <Text className="font-sans text-meta text-danger">{errors.awake}</Text>}
        <Pressable
          accessibilityRole="button"
          onPress={() => update({ periods: [...periods, newAwakePeriod(draft.startedAt, endedAt, periods)] })}
          className="h-11 flex-row items-center gap-2 self-start rounded-chip border border-line bg-raised px-4"
        >
          <Plus color={ink} size={16} strokeWidth={3} />
          <Text className="font-semibold text-label text-ink">Add a wake-up</Text>
        </Pressable>
      </View>
      {duration && periods.length === 0 && (
        <View className="flex-row items-center justify-between rounded-tile bg-sleep-soft px-4 py-3">
          <Text className="font-semibold text-body text-on-sleep">{duration.awake ? 'Asleep' : 'Duration'}</Text>
          <Text className="font-bold text-row-title text-on-sleep">
            {duration.awake ? `${duration.asleep} · awake ${duration.awake}` : duration.asleep}
          </Text>
        </View>
      )}
      <SleepDetailFields
        details={details}
        onChange={(patch) => onChange({ ...draft, details: { ...details, ...patch } })}
      />
    </FormSection>
  );
}
