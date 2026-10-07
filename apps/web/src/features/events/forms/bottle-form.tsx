import { formatVolume, volumeToMl, type BottleContent, type DraftOfType } from '@babble/domain';
import { DateTimeField } from '#/components/ui/field';
import { Segmented } from '#/components/ui/segmented';
import { Stepper } from '#/components/ui/stepper';
import { FormSection, instantDraft, type FormProps } from './shared';

const CONTENTS: { value: BottleContent; label: string }[] = [
  { value: 'breast_milk', label: 'Breast milk' },
  { value: 'formula', label: 'Formula' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'other', label: 'Other' },
];

export function BottleForm({ draft, onChange, errors, timeZone, units }: FormProps<DraftOfType<'bottle'>>) {
  const details = draft.details;
  const set = (patch: Partial<typeof details>) => onChange({ ...draft, details: { ...details, ...patch } });
  const unit = units === 'metric' ? 'ml' : 'oz';
  const step = units === 'metric' ? 10 : 0.5;
  const display = (ml: number | null) =>
    ml === null ? null : units === 'metric' ? ml : Number((ml / 29.5735).toFixed(1));
  const drank = details.amountMl !== null ? details.amountMl - (details.amountLeftMl ?? 0) : null;

  return (
    <FormSection>
      <Segmented label="Contents" value={details.content} options={CONTENTS} onChange={(content) => set({ content })} />
      <Stepper
        label="Amount"
        unit={unit}
        step={step}
        max={units === 'metric' ? 2000 : 67}
        value={display(details.amountMl)}
        onChange={(value) => set({ amountMl: value === null ? null : volumeToMl(value, units) })}
      />
      {errors.amountMl && <p className="text-meta text-danger">{errors.amountMl}</p>}
      <Stepper
        label="Left over (optional)"
        unit={unit}
        step={units === 'metric' ? 5 : 0.5}
        value={display(details.amountLeftMl)}
        onChange={(value) => set({ amountLeftMl: value === null ? null : volumeToMl(value, units) })}
      />
      {errors.amountLeftMl && <p className="text-meta text-danger">{errors.amountLeftMl}</p>}
      {drank !== null && details.amountLeftMl !== null && (
        <p className="text-meta text-ink-2">Drank {formatVolume(drank, units)}</p>
      )}
      <DateTimeField
        label="Time"
        timeZone={timeZone}
        value={draft.startedAt}
        error={errors.startedAt}
        onChange={(at) => onChange(instantDraft(draft, at))}
      />
    </FormSection>
  );
}
