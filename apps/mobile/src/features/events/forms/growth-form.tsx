import { lengthToMm, weightToGrams, type DraftOfType } from '@babble/domain';
import { Text } from 'react-native';
import { DateTimeField } from '@/components/datetime-field';
import { TextField } from '@/components/text-field';
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
        keyboardType="decimal-pad"
        defaultValue={fmt(details.weightG, metric ? 1000 : 453.59237)}
        error={errors.weightG}
        onChangeText={(text) => {
          const value = parse(text);
          set({ weightG: value === null ? null : weightToGrams(value, units) });
        }}
      />
      <TextField
        label={`Length (${metric ? 'cm' : 'in'})`}
        keyboardType="decimal-pad"
        defaultValue={fmt(details.lengthMm, metric ? 10 : 25.4)}
        error={errors.lengthMm}
        onChangeText={(text) => {
          const value = parse(text);
          set({ lengthMm: value === null ? null : lengthToMm(value, units) });
        }}
      />
      <TextField
        label={`Head circumference (${metric ? 'cm' : 'in'})`}
        keyboardType="decimal-pad"
        defaultValue={fmt(details.headCircumferenceMm, metric ? 10 : 25.4)}
        error={errors.headCircumferenceMm}
        onChangeText={(text) => {
          const value = parse(text);
          set({ headCircumferenceMm: value === null ? null : lengthToMm(value, units) });
        }}
      />
      {errors.details && <Text className="font-sans text-meta text-danger">{errors.details}</Text>}
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
