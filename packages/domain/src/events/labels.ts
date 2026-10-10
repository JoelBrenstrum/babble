import type { Mood, PooColour, PooTexture, Size, SleepLocation, SolidsAmount, SolidsReaction } from './types';

export const SIZE_LABELS: Record<Size, string> = {
  tiny: 'Tiny',
  little: 'Little',
  medium: 'Medium',
  large: 'Large',
  massive: 'Massive',
};

export const SLEEP_LOCATION_LABELS: Record<SleepLocation, string> = {
  cot: 'Cot',
  bassinet: 'Bassinet',
  pram: 'Pram',
  car: 'Car',
  swing: 'Swing',
  held: 'Held',
  nursing: 'Nursing',
  bottle: 'Bottle',
  co_sleep: 'Co-sleep',
  next_to_carer: 'Next to carer',
  other: 'Other',
};

export const SOLIDS_AMOUNT_LABELS: Record<SolidsAmount, string> = { taste: 'A taste', some: 'Some', lots: 'Lots' };

export const SOLIDS_REACTION_LABELS: Record<SolidsReaction, string> = {
  loved: 'Loved it',
  liked: 'Liked it',
  unsure: 'Not sure',
  disliked: 'Disliked it',
};

export const MOOD_LABELS: Record<Mood, string> = { happy: 'Happy', upset: 'Upset' };

export const POO_COLOUR_LABELS: Record<PooColour, string> = {
  yellow: 'Yellow',
  mustard: 'Mustard',
  green: 'Green',
  dark_green: 'Dark green',
  brown: 'Brown',
  orange: 'Orange',
  black: 'Black',
  red: 'Red',
  white_grey: 'White / grey',
};

export const POO_TEXTURE_LABELS: Record<PooTexture, string> = {
  runny: 'Runny',
  loose: 'Loose',
  seedy: 'Seedy',
  pasty: 'Pasty',
  formed: 'Formed',
  mucousy: 'Mucousy',
  solid: 'Solid',
  pebbles: 'Pebbles',
  diarrhea: 'Diarrhoea',
};

export const CAUTION_COLOURS: readonly PooColour[] = ['red', 'black', 'white_grey'];

export function joinLabels(labels: readonly string[], separator: string): string {
  return labels.map((label, index) => (index === 0 ? label : label.toLowerCase())).join(separator);
}
