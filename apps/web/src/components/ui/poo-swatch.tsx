import type { PooColour } from '@babble/domain';
import { cn } from '#/lib/cn';

export const POO_COLOURS: { value: PooColour; label: string; token: string }[] = [
  { value: 'yellow', label: 'Yellow', token: 'yellow' },
  { value: 'mustard', label: 'Mustard', token: 'mustard' },
  { value: 'green', label: 'Green', token: 'green' },
  { value: 'dark_green', label: 'Dark green', token: 'dark-green' },
  { value: 'brown', label: 'Brown', token: 'brown' },
  { value: 'orange', label: 'Orange', token: 'orange' },
  { value: 'black', label: 'Black', token: 'black' },
  { value: 'red', label: 'Red', token: 'red' },
  { value: 'white_grey', label: 'White / grey', token: 'white-grey' },
];

export const CAUTION_COLOURS: readonly PooColour[] = ['red', 'black', 'white_grey'];

export function swatchBackground(colours: readonly PooColour[]): string {
  const [first, second] = colours.map(
    (colour) => `rgb(var(--poo-${POO_COLOURS.find((c) => c.value === colour)!.token}))`,
  );
  if (!first) return 'transparent';
  return second ? `linear-gradient(135deg, ${first} 50%, ${second} 50%)` : first;
}

export function PooSwatch({ colours, className }: { colours: readonly PooColour[]; className?: string }) {
  if (colours.length === 0) return null;
  return (
    <span
      aria-label={colours.map((colour) => POO_COLOURS.find((c) => c.value === colour)!.label).join(' and ')}
      role="img"
      className={cn('inline-block size-4 shrink-0 rounded-full', className)}
      style={{ background: swatchBackground(colours), boxShadow: 'inset 0 0 0 1.5px rgb(var(--swatch-edge) / 0.6)' }}
    />
  );
}
