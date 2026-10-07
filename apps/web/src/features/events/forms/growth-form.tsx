import { lengthToMm, parseDecimalInput, sanitizeDecimalInput, weightToGrams, type DraftOfType } from '@babble/domain';
import { useState } from 'react';
import { DateTimeField, TextField } from '#/components/ui/field';
import { FormSection, instantDraft, type FormProps } from './shared';

function initial(value: number | null, divisor: number): string {
  return value === null ? '' : String(Number((value / divisor).toFixed(2)));
}

function MeasurementField({
  label,
  initialValue,
  error,
  onValue,
}: {
  label: string;
  initialValue: string;
  error?: string;
  onValue: (value: number | null) => void;
}) {
  const [text, setText] = useState(initialValue);
  return (
    <TextField
      label={label}
      inputMode="decimal"
      autoComplete="off"
      value={text}
      error={error}
      onChange={(event) => {
        const next = sanitizeDecimalInput(event.target.value);
        setText(next);
        onValue(parseDecimalInput(next));
      }}
    />
  );
}

export function GrowthForm({ draft, onChange, errors, timeZone, units }: FormProps<DraftOfType<'growth'>>) {
  const details = draft.details;
  const set = (patch: Partial<typeof details>) => onChange({ ...draft, details: { ...details, ...patch } });
  const metric = units === 'metric';

  return (
    <FormSection>
      <MeasurementField
        label={`Weight (${metric ? 'kg' : 'lb'})`}
        initialValue={initial(details.weightG, metric ? 1000 : 453.59237)}
        error={errors.weightG}
        onValue={(value) => set({ weightG: value === null ? null : weightToGrams(value, units) })}
      />
      <MeasurementField
        label={`Length (${metric ? 'cm' : 'in'})`}
        initialValue={initial(details.lengthMm, metric ? 10 : 25.4)}
        error={errors.lengthMm}
        onValue={(value) => set({ lengthMm: value === null ? null : lengthToMm(value, units) })}
      />
      <MeasurementField
        label={`Head circumference (${metric ? 'cm' : 'in'})`}
        initialValue={initial(details.headCircumferenceMm, metric ? 10 : 25.4)}
        error={errors.headCircumferenceMm}
        onValue={(value) => set({ headCircumferenceMm: value === null ? null : lengthToMm(value, units) })}
      />
      {errors.details && <p className="text-meta text-danger">{errors.details}</p>}
      <p className="text-meta text-ink-2">Every field is optional. Units follow Settings.</p>
      <DateTimeField
        label="Measured"
        timeZone={timeZone}
        value={draft.startedAt}
        error={errors.startedAt}
        onChange={(at) => onChange(instantDraft(draft, at))}
      />
    </FormSection>
  );
}
