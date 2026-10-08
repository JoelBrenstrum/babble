import {
  growthInputUnit,
  lengthToMm,
  parseDecimalInput,
  sanitizeDecimalInput,
  toGrowthInput,
  weightToGrams,
  type DraftOfType,
  type GrowthDetails,
} from '@babble/domain';
import { useState } from 'react';
import { Text } from 'react-native';
import { DateTimeField } from '@/components/datetime-field';
import { TextField } from '@/components/text-field';
import { FormSection, instantDraft, type FormProps } from './shared';

function MeasurementField({
  label,
  initialValue,
  placeholder,
  error,
  onValue,
}: {
  label: string;
  initialValue: string;
  placeholder?: string | null;
  error?: string;
  onValue: (value: number | null) => void;
}) {
  const [text, setText] = useState(initialValue);
  return (
    <TextField
      label={label}
      keyboardType="decimal-pad"
      value={text}
      placeholder={placeholder ?? undefined}
      error={error}
      onChangeText={(input) => {
        const next = sanitizeDecimalInput(input);
        setText(next);
        onValue(parseDecimalInput(next));
      }}
    />
  );
}

export function GrowthForm({
  draft,
  onChange,
  errors,
  timeZone,
  units,
  previous,
}: FormProps<DraftOfType<'growth'>> & { previous?: Record<keyof GrowthDetails, string | null> }) {
  const details = draft.details;
  const set = (patch: Partial<typeof details>) => onChange({ ...draft, details: { ...details, ...patch } });
  const field = (measure: keyof GrowthDetails, name: string) => ({
    label: `${name} (${growthInputUnit(measure, units).label})`,
    initialValue: details[measure] === null ? '' : toGrowthInput(details[measure], measure, units),
    placeholder: previous?.[measure],
    error: errors[measure],
  });

  return (
    <FormSection>
      <MeasurementField
        {...field('weightG', 'Weight')}
        onValue={(value) => set({ weightG: value === null ? null : weightToGrams(value, units) })}
      />
      <MeasurementField
        {...field('lengthMm', 'Length')}
        onValue={(value) => set({ lengthMm: value === null ? null : lengthToMm(value, units) })}
      />
      <MeasurementField
        {...field('headCircumferenceMm', 'Head circumference')}
        onValue={(value) => set({ headCircumferenceMm: value === null ? null : lengthToMm(value, units) })}
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
