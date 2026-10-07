import { formatVolume, volumeToMl, type DraftOfType } from '@babble/domain';
import { Stepper } from '#/components/ui/stepper';
import { SegmentTimesFields } from './segment-form';
import { FormSection, type FormProps } from './shared';

export function PumpForm(props: FormProps<DraftOfType<'pump'>> & { amountsFirst?: boolean }) {
  const { draft, onChange, units, errors, amountsFirst } = props;
  const details = draft.details;
  const set = (patch: Partial<typeof details>) => onChange({ ...draft, details: { ...details, ...patch } });
  const unit = units === 'metric' ? 'ml' : 'oz';
  const display = (ml: number | null) =>
    ml === null ? null : units === 'metric' ? ml : Number((ml / 29.5735).toFixed(1));
  const toMl = (value: number | null) => (value === null ? null : volumeToMl(value, units));
  const total = (details.leftMl ?? 0) + (details.rightMl ?? 0);

  const amounts = (
    <FormSection>
      <div className="grid gap-5 sm:grid-cols-2">
        <Stepper
          label="Left amount"
          unit={unit}
          step={units === 'metric' ? 10 : 0.5}
          value={display(details.leftMl)}
          onChange={(v) => set({ leftMl: toMl(v), totalMl: null })}
        />
        <Stepper
          label="Right amount"
          unit={unit}
          step={units === 'metric' ? 10 : 0.5}
          value={display(details.rightMl)}
          onChange={(v) => set({ rightMl: toMl(v), totalMl: null })}
        />
      </div>
      {(details.leftMl !== null || details.rightMl !== null) && (
        <p className="text-row-title font-semibold">Total {formatVolume(total, units)}</p>
      )}
      {details.totalMl !== null && details.leftMl === null && details.rightMl === null && (
        <p className="text-meta text-ink-2">Total recorded: {formatVolume(details.totalMl, units)}</p>
      )}
      {errors.amounts && <p className="text-meta text-danger">{errors.amounts}</p>}
    </FormSection>
  );

  return (
    <FormSection>
      {amountsFirst && amounts}
      <SegmentTimesFields {...props} />
      {!amountsFirst && amounts}
    </FormSection>
  );
}
