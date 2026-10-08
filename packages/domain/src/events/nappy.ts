import type { NappyDetails } from './types';

export type NappyType = 'wet' | 'dirty' | 'both' | 'dry';

export function nappyType(details: NappyDetails): NappyType | null {
  if (details.typePending) return null;
  if (details.wet && details.dirty) return 'both';
  if (details.wet) return 'wet';
  return details.dirty ? 'dirty' : 'dry';
}

export function withNappyType(details: NappyDetails, type: NappyType): NappyDetails {
  const { typePending: _pending, ...rest } = details;
  const wet = type === 'wet' || type === 'both';
  const dirty = type === 'dirty' || type === 'both';
  return {
    ...rest,
    wet,
    dirty,
    wetSize: wet ? details.wetSize : null,
    ...(dirty ? {} : { pooSize: null, pooColours: [], pooTextures: [] }),
  };
}
