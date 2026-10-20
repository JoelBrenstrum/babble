import type { PooColour } from '@babble/domain';
import { cn } from '#/lib/cn';

const POO_COLOUR: Record<PooColour, { label: string; token: string }> = {
  yellow: { label: 'Yellow', token: 'yellow' },
  mustard: { label: 'Mustard', token: 'mustard' },
  green: { label: 'Green', token: 'green' },
  dark_green: { label: 'Dark green', token: 'dark-green' },
  brown: { label: 'Brown', token: 'brown' },
  orange: { label: 'Orange', token: 'orange' },
  black: { label: 'Black', token: 'black' },
  red: { label: 'Red', token: 'red' },
  white_grey: { label: 'White / grey', token: 'white-grey' },
};

export const pooColour = (value: PooColour) => POO_COLOUR[value];

export const POO_COLOURS = (Object.keys(POO_COLOUR) as PooColour[]).map((value) => ({ value, ...pooColour(value) }));

export const CAUTION_COLOURS: readonly PooColour[] = ['red', 'black', 'white_grey'];

export function swatchBackground(colours: readonly PooColour[]): string {
  const [first, second] = colours.map((colour) => `rgb(var(--poo-${pooColour(colour).token}))`);
  if (!first) return 'transparent';
  return second ? `linear-gradient(135deg, ${first} 50%, ${second} 50%)` : first;
}

export function PooSwatch({ colours, className }: { colours: readonly PooColour[]; className?: string }) {
  if (colours.length === 0) return null;
  return (
    <span
      aria-label={colours.map((colour) => pooColour(colour).label).join(' and ')}
      role="img"
      className={cn('inline-block size-4 shrink-0 rounded-full', className)}
      style={{ background: swatchBackground(colours), boxShadow: 'inset 0 0 0 1.5px rgb(var(--swatch-edge) / 0.6)' }}
    />
  );
}
