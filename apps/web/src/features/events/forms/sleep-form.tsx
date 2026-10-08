import type { DraftOfType, FallAsleep, Mood, SleepDetails, SleepLocation } from '@babble/domain';
import { MultiChips, SingleChips } from '#/components/ui/chips';
import { DateTimeField } from '#/components/ui/field';
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
      <div className="grid gap-5 sm:grid-cols-2">
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
      </div>
      <label className="flex min-h-tap items-center gap-3 text-body">
        <input
          type="checkbox"
          className="size-5 accent-[rgb(var(--primary))]"
          checked={details.wokenByCarer}
          onChange={(event) => onChange({ wokenByCarer: event.target.checked })}
        />
        Woken by a carer
      </label>
    </>
  );
}

export function SleepForm({ draft, onChange, errors, timeZone }: FormProps<DraftOfType<'sleep'>>) {
  const details = draft.details;
  return (
    <FormSection>
      <div className="grid gap-5 sm:grid-cols-2">
        <DateTimeField
          label="Fell asleep"
          timeZone={timeZone}
          value={draft.startedAt}
          error={errors.startedAt}
          onChange={(startedAt) => onChange({ ...draft, startedAt })}
        />
        <DateTimeField
          label="Woke up"
          timeZone={timeZone}
          value={draft.endedAt ?? draft.startedAt}
          error={errors.endedAt}
          onChange={(endedAt) => onChange({ ...draft, endedAt })}
        />
      </div>
      <SleepDetailFields
        details={details}
        onChange={(patch) => onChange({ ...draft, details: { ...details, ...patch } })}
      />
    </FormSection>
  );
}
