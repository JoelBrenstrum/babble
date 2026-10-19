import { formatVolume, volumeToMl, type DraftOfType, type PumpDetails, type Units } from '@babble/domain';
import { Text } from 'react-native';
import { Stepper } from '@/components/stepper';
import { SegmentTimesFields } from './segment-form';
import { FormSection, type FormProps } from './shared';

export type PumpSidePatch = Pick<PumpDetails, 'leftMl'> | Pick<PumpDetails, 'rightMl'>;

export function PumpAmountFields({
  details,
  units,
  onChange,
}: {
  details: PumpDetails;
  units: Units;
  onChange: (patch: PumpSidePatch) => void;
}) {
  const unit = units === 'metric' ? 'ml' : 'oz';
  const display = (ml: number | null) =>
    ml === null ? null : units === 'metric' ? ml : Number((ml / 29.5735).toFixed(1));
  const toMl = (value: number | null) => (value === null ? null : volumeToMl(value, units));

  return (
    <>
      <Stepper
        label="Left amount"
        unit={unit}
        step={units === 'metric' ? 10 : 0.5}
        value={display(details.leftMl)}
        onChange={(v) => onChange({ leftMl: toMl(v) })}
      />
      <Stepper
        label="Right amount"
        unit={unit}
        step={units === 'metric' ? 10 : 0.5}
        value={display(details.rightMl)}
        onChange={(v) => onChange({ rightMl: toMl(v) })}
      />
      {(details.leftMl !== null || details.rightMl !== null) && (
        <Text className="font-semibold text-row-title text-ink">{`Total ${formatVolume((details.leftMl ?? 0) + (details.rightMl ?? 0), units)}`}</Text>
      )}
    </>
  );
}

export function PumpForm(props: FormProps<DraftOfType<'pump'>> & { amountsFirst?: boolean }) {
  const { draft, onChange, units, errors, amountsFirst } = props;
  const details = draft.details;

  const amounts = (
    <FormSection>
      <PumpAmountFields
        details={details}
        units={units}
        onChange={(patch) => onChange({ ...draft, details: { ...details, ...patch, totalMl: null } })}
      />
      {errors.amounts && <Text className="font-sans text-meta text-danger">{errors.amounts}</Text>}
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
