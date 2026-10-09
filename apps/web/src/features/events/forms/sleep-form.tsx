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
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { MultiChips, SingleChips } from '#/components/ui/chips';
import { DateTimeField } from '#/components/ui/field';
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
  const endedAt = draft.endedAt ?? draft.startedAt;
  const [periods, setPeriods] = useState<AwakePeriod[]>(() => awakePeriods(draft.segments, draft.startedAt, endedAt));
  const duration = napDurationText(draft.startedAt, draft.endedAt, periods);

  function update(next: { startedAt?: string; endedAt?: string; periods?: AwakePeriod[] }) {
    const startedAt = next.startedAt ?? draft.startedAt;
    const end = next.endedAt ?? endedAt;
    const nextPeriods = next.periods ?? periods;
    if (next.periods) setPeriods(next.periods);
    onChange({ ...draft, startedAt, endedAt: end, segments: stretchesWithAwake(startedAt, end, nextPeriods) });
  }

  return (
    <FormSection>
      <div className="grid gap-5 sm:grid-cols-2">
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
      </div>
      <section className="flex flex-col gap-3" aria-label="Wake-ups">
        <span className="text-label font-semibold">Wake-ups</span>
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
        {errors.awake && <p className="text-meta text-danger">{errors.awake}</p>}
        <button
          type="button"
          onClick={() => update({ periods: [...periods, newAwakePeriod(draft.startedAt, endedAt, periods)] })}
          className="inline-flex h-11 items-center gap-2 self-start rounded-chip border border-line bg-raised px-4 text-label font-semibold hover:border-ink-3"
        >
          <Plus className="size-4" strokeWidth={3} />
          Add a wake-up
        </button>
      </section>
      {duration && periods.length === 0 && (
        <div className="flex items-center justify-between rounded-tile bg-sleep-soft px-4 py-3 text-on-sleep">
          <span className="text-body font-semibold">{duration.awake ? 'Asleep' : 'Duration'}</span>
          <span className="tabular text-row-title font-bold">
            {duration.asleep}
            {duration.awake && <span className="ml-2 text-meta font-semibold">· awake {duration.awake}</span>}
          </span>
        </div>
      )}
      <SleepDetailFields
        details={details}
        onChange={(patch) => onChange({ ...draft, details: { ...details, ...patch } })}
      />
    </FormSection>
  );
}
