import { formatVolume, volumeToMl, type BottleContent, type DraftOfType } from '@babble/domain';
import { Text } from 'react-native';
import { DateTimeField } from '@/components/datetime-field';
import { Segmented } from '@/components/segmented';
import { Stepper } from '@/components/stepper';
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
  const display = (ml: number | null) =>
    ml === null ? null : units === 'metric' ? ml : Number((ml / 29.5735).toFixed(1));
  const drank = details.amountMl !== null ? details.amountMl - (details.amountLeftMl ?? 0) : null;

  return (
    <FormSection>
      <Segmented value={details.content} options={CONTENTS} onChange={(content) => set({ content })} />
      <Stepper
        label="Amount"
        unit={unit}
        step={units === 'metric' ? 10 : 0.5}
        value={display(details.amountMl)}
        onChange={(v) => set({ amountMl: v === null ? null : volumeToMl(v, units) })}
      />
      {errors.amountMl && <Text className="font-sans text-meta text-danger">{errors.amountMl}</Text>}
      <Stepper
        label="Left over (optional)"
        unit={unit}
        step={units === 'metric' ? 5 : 0.5}
        value={display(details.amountLeftMl)}
        onChange={(v) => set({ amountLeftMl: v === null ? null : volumeToMl(v, units) })}
      />
      {errors.amountLeftMl && <Text className="font-sans text-meta text-danger">{errors.amountLeftMl}</Text>}
      {drank !== null && details.amountLeftMl !== null && (
        <Text className="font-sans text-meta text-ink-2">{`Drank ${formatVolume(drank, units)}`}</Text>
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
