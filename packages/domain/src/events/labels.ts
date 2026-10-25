import type {
  Mood,
  PooColour,
  PooTexture,
  Side,
  Size,
  SleepLocation,
  SleepQuality,
  SolidsAmount,
  SolidsReaction,
} from './types';

export const SLEEP_QUALITIES: readonly SleepQuality[] = [1, 2, 3, 4, 5];

export const SLEEP_QUALITY_LABELS: Record<SleepQuality, string> = {
  1: 'Hard to settle, wakeful',
  2: 'Restless',
  3: 'Mixed',
  4: 'Settled',
  5: 'Deep and settled',
};

export const SIDE_LABEL: Record<Side, string> = { left: 'Left', right: 'Right' };

export const SIZES: readonly Size[] = ['tiny', 'little', 'medium', 'large', 'massive'];

export const SIZE_LABELS: Record<Size, string> = {
  tiny: 'Tiny',
  little: 'Little',
  medium: 'Medium',
  large: 'Large',
  massive: 'Massive',
};

export const WET_SIZE_LABELS: Record<Size, string> = {
  tiny: 'Damp',
  little: 'Light',
  medium: 'Medium',
  large: 'Heavy',
  massive: 'Soaked',
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

export const SOLIDS_AMOUNT_OPTIONS: { value: SolidsAmount; label: string }[] = (['taste', 'some', 'lots'] as const).map(
  (value) => ({ value, label: SOLIDS_AMOUNT_LABELS[value] }),
);

export const SOLIDS_REACTION_OPTIONS: { value: SolidsReaction; label: string }[] = (
  ['loved', 'liked', 'unsure', 'disliked'] as const
).map((value) => ({ value, label: SOLIDS_REACTION_LABELS[value] }));

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
