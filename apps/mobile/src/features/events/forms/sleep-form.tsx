import {
  awakePeriods,
  SLEEP_QUALITIES,
  SLEEP_QUALITY_LABELS,
  stretchesWithAwake,
  type DraftOfType,
  type FallAsleep,
  type Mood,
  type SleepDetails,
  type SleepLocation,
} from '@babble/domain';
import { useState } from 'react';
import { Text } from 'react-native';
import { CheckRow, MultiChips, SingleChips } from '@/components/chips';
import { DateTimeField } from '@/components/datetime-field';
import { RatingScale } from '@/components/rating-scale';
import { NapEditor } from '../nap-editor';
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
      <RatingScale
        label="Sleep quality"
        options={SLEEP_QUALITIES}
        labels={SLEEP_QUALITY_LABELS}
        value={details.quality}
        onChange={(quality) => onChange({ quality })}
        low="Hard to settle, wakeful"
        high="Deep, settled sleep"
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
  const [rowsVersion, setRowsVersion] = useState(0);

  function setRange(next: { startedAt?: string; endedAt?: string }) {
    const startedAt = next.startedAt ?? draft.startedAt;
    const end = next.endedAt ?? endedAt;
    const periods = awakePeriods(draft.segments, draft.startedAt, endedAt);
    onChange({ ...draft, startedAt, endedAt: end, segments: stretchesWithAwake(startedAt, end, periods) });
    setRowsVersion((version) => version + 1);
  }

  return (
    <FormSection>
      <DateTimeField
        label="Fell asleep"
        timeZone={timeZone}
        value={draft.startedAt}
        error={errors.startedAt}
        onChange={(startedAt) => setRange({ startedAt })}
      />
      <DateTimeField
        label="Woke up"
        timeZone={timeZone}
        value={endedAt}
        error={errors.endedAt}
        onChange={(value) => setRange({ endedAt: value })}
      />
      <NapEditor
        key={rowsVersion}
        startedAt={draft.startedAt}
        endedAt={endedAt}
        segments={draft.segments}
        onChange={(next) => onChange({ ...draft, ...next })}
      />
      {errors.awake && <Text className="font-sans text-meta text-danger">{errors.awake}</Text>}
      <SleepDetailFields
        details={details}
        onChange={(patch) => onChange({ ...draft, details: { ...details, ...patch } })}
      />
    </FormSection>
  );
}
