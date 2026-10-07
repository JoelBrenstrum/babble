import type { DraftOfType, PooTexture } from '@babble/domain';
import { MultiChips } from '#/components/ui/chips';
import { DateTimeField } from '#/components/ui/field';
import { Segmented } from '#/components/ui/segmented';
import { SizeSelector } from '#/components/ui/size-selector';
import { SwatchPicker } from '#/components/ui/swatch-picker';
import { FormSection, instantDraft, type FormProps } from './shared';

type Kind = 'wet' | 'dirty' | 'both' | 'dry';

const TEXTURES: { value: PooTexture; label: string }[] = [
  { value: 'runny', label: 'Runny' },
  { value: 'seedy', label: 'Seedy' },
  { value: 'pasty', label: 'Pasty' },
  { value: 'formed', label: 'Formed' },
  { value: 'mucousy', label: 'Mucousy' },
  { value: 'solid', label: 'Solid' },
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
        label="Type"
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
            options={TEXTURES.concat(
              details.pooTextures
                .filter((texture) => !TEXTURES.some((t) => t.value === texture))
                .map((texture) => ({ value: texture, label: texture[0]!.toUpperCase() + texture.slice(1) })),
            )}
            value={details.pooTextures}
            onChange={(pooTextures) => set({ pooTextures })}
          />
        </>
      )}
      {errors.pooColours && <p className="text-meta text-danger">{errors.pooColours}</p>}
      <label className="flex min-h-tap items-center gap-3 text-body">
        <input
          type="checkbox"
          className="size-5 accent-[rgb(var(--primary))]"
          checked={details.rash}
          onChange={(event) => set({ rash: event.target.checked })}
        />
        Nappy rash
      </label>
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
