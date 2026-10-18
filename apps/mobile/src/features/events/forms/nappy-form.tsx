import { instantDraft, nappyType, POO_TEXTURE_LABELS, withNappyType, type DraftOfType } from '@babble/domain';
import { Text } from 'react-native';
import { CheckRow, MultiChips } from '@/components/chips';
import { DateTimeField } from '@/components/datetime-field';
import { Segmented } from '@/components/segmented';
import { SizeSelector } from '@/components/size-selector';
import { SwatchPicker } from '@/components/swatch-picker';
import { labelOptions } from '@/lib/options';
import { FormSection, type FormProps } from './shared';

const TEXTURES = labelOptions(POO_TEXTURE_LABELS, ['runny', 'seedy', 'pasty', 'formed', 'mucousy', 'solid']);

export function NappyForm({ draft, onChange, errors, timeZone }: FormProps<DraftOfType<'nappy'>>) {
  const details = draft.details;
  const set = (patch: Partial<typeof details>) => onChange({ ...draft, details: { ...details, ...patch } });

  return (
    <FormSection>
      <Segmented
        value={nappyType(details)}
        onChange={(type) => onChange({ ...draft, details: withNappyType(details, type) })}
        options={[
          { value: 'wet', label: 'Wet' },
          { value: 'dirty', label: 'Dirty' },
          { value: 'both', label: 'Both' },
          { value: 'dry', label: 'Dry' },
        ]}
      />
      {details.wet && (
        <SizeSelector label="Wee size" value={details.wetSize} onChange={(wetSize) => set({ wetSize })} />
      )}
      {details.dirty && (
        <>
          <SwatchPicker value={details.pooColours} onChange={(pooColours) => set({ pooColours })} />
          <SizeSelector label="Poo size" value={details.pooSize} onChange={(pooSize) => set({ pooSize })} />
          <MultiChips
            label="Texture"
            options={TEXTURES}
            value={details.pooTextures}
            onChange={(pooTextures) => set({ pooTextures })}
          />
        </>
      )}
      {errors.pooColours && <Text className="font-sans text-meta text-danger">{errors.pooColours}</Text>}
      <CheckRow label="Nappy rash" value={details.rash} onChange={(rash) => set({ rash })} />
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
