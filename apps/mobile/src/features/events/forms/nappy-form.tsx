import type { DraftOfType, PooTexture } from '@babble/domain';
import { Text } from 'react-native';
import { CheckRow, MultiChips } from '@/components/chips';
import { DateTimeField } from '@/components/datetime-field';
import { Segmented } from '@/components/segmented';
import { SizeSelector } from '@/components/size-selector';
import { SwatchPicker } from '@/components/swatch-picker';
import { FormSection, instantDraft, type FormProps } from './shared';

type Kind = 'wet' | 'dirty' | 'both' | 'dry';

const TEXTURES: { value: PooTexture; label: string }[] = [
  { value: 'runny', label: 'Runny' },
  { value: 'seedy', label: 'Seedy' },
  { value: 'pasty', label: 'Pasty' },
  { value: 'formed', label: 'Formed' },
  { value: 'mucousy', label: 'Mucousy' },
  { value: 'hard', label: 'Hard' },
];

export function NappyForm({ draft, onChange, errors, timeZone }: FormProps<DraftOfType<'nappy'>>) {
  const details = draft.details;
  const set = (patch: Partial<typeof details>) => onChange({ ...draft, details: { ...details, ...patch } });
  const kind: Kind = details.wet && details.dirty ? 'both' : details.wet ? 'wet' : details.dirty ? 'dirty' : 'dry';

  function setKind(next: Kind) {
    const wet = next === 'wet' || next === 'both';
    const dirty = next === 'dirty' || next === 'both';
    set({
      wet,
      dirty,
      wetSize: wet ? details.wetSize : null,
      ...(dirty ? {} : { pooSize: null, pooColours: [], pooTextures: [] }),
    });
  }

  return (
    <FormSection>
      <Segmented
        value={kind}
        onChange={setKind}
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
