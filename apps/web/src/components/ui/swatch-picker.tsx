import type { PooColour } from '@babble/domain';
import { Stethoscope } from 'lucide-react';
import { cn } from '#/lib/cn';
import { CAUTION_COLOURS, POO_COLOURS, swatchBackground } from './poo-swatch';

export function SwatchPicker({
  value,
  onChange,
}: {
  value: readonly PooColour[];
  onChange: (value: PooColour[]) => void;
}) {
  const full = value.length >= 2;
  const caution = value.some((colour) => CAUTION_COLOURS.includes(colour));
  const summary = value.map((colour) => POO_COLOURS.find((c) => c.value === colour)!.label).join(' + ');

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 flex w-full items-baseline justify-between text-label font-semibold">
        Poo colour
        <span className="text-meta font-normal text-ink-2">
          {summary ? `${summary} · ${value.length} of 2` : 'Pick up to 2'}
        </span>
      </legend>
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-9">
        {POO_COLOURS.map((colour) => {
          const index = value.indexOf(colour.value);
          const selected = index >= 0;
          return (
            <button
              key={colour.value}
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={colour.label}
              disabled={full && !selected}
              onClick={() => onChange(selected ? value.filter((v) => v !== colour.value) : [...value, colour.value])}
              className={cn('relative flex flex-col items-center gap-1 disabled:opacity-45')}
            >
              <span
                className="block size-11 rounded-full"
                style={{
                  background: swatchBackground([colour.value]),
                  boxShadow: selected
                    ? 'inset 0 0 0 1.5px rgb(var(--swatch-edge) / 0.6), 0 0 0 3px rgb(var(--bg)), 0 0 0 5.5px rgb(var(--ink))'
                    : 'inset 0 0 0 1.5px rgb(var(--swatch-edge) / 0.6)',
                }}
              />
              {selected && (
                <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-ink text-caption font-bold text-bg">
                  {index + 1}
                </span>
              )}
              <span className="text-caption text-ink-2">{colour.label}</span>
            </button>
          );
        })}
      </div>
      {caution && (
        <div className="flex gap-3 rounded-tile bg-caution-soft px-4 py-3 text-meta text-on-caution">
          <Stethoscope className="mt-0.5 size-4 shrink-0" strokeWidth={2.75} />
          <span>
            <strong>Worth checking with your provider.</strong> Red, black or white poo can need a closer look. Take a
            photo and mention it to your midwife or GP.
          </span>
        </div>
      )}
      {value.length === 2 && (
        <div className="flex items-center gap-2 text-meta text-ink-2">
          Shown as <span className="inline-block size-6 rounded-full" style={{ background: swatchBackground(value) }} />
        </div>
      )}
    </fieldset>
  );
}
