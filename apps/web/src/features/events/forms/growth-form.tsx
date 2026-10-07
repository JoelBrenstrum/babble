import { lengthToMm, weightToGrams, type DraftOfType } from '@babble/domain';
import { DateTimeField, TextField } from '#/components/ui/field';
import { FormSection, instantDraft, type FormProps } from './shared';

function parse(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

export function GrowthForm({ draft, onChange, errors, timeZone, units }: FormProps<DraftOfType<'growth'>>) {
  const details = draft.details;
  const set = (patch: Partial<typeof details>) => onChange({ ...draft, details: { ...details, ...patch } });
  const metric = units === 'metric';
  const fmt = (value: number | null, divisor: number) =>
    value === null ? '' : String(Number((value / divisor).toFixed(2)));

  return (
    <FormSection>
      <TextField
        label={`Weight (${metric ? 'kg' : 'lb'})`}
        inputMode="decimal"
        defaultValue={fmt(details.weightG, metric ? 1000 : 453.59237)}
        error={errors.weightG}
        onChange={(event) => {
          const value = parse(event.target.value);
          set({ weightG: value === null ? null : weightToGrams(value, units) });
        }}
      />
      <TextField
        label={`Length (${metric ? 'cm' : 'in'})`}
        inputMode="decimal"
        defaultValue={fmt(details.lengthMm, metric ? 10 : 25.4)}
        error={errors.lengthMm}
        onChange={(event) => {
          const value = parse(event.target.value);
          set({ lengthMm: value === null ? null : lengthToMm(value, units) });
        }}
      />
      <TextField
        label={`Head circumference (${metric ? 'cm' : 'in'})`}
        inputMode="decimal"
        defaultValue={fmt(details.headCircumferenceMm, metric ? 10 : 25.4)}
        error={errors.headCircumferenceMm}
        onChange={(event) => {
          const value = parse(event.target.value);
          set({ headCircumferenceMm: value === null ? null : lengthToMm(value, units) });
        }}
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
