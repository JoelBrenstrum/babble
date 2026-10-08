import { describe, expect, it } from 'vitest';
import { emptyDraft } from './drafts';
import { nappyType, withNappyType } from './nappy';

const NOW = new Date('2026-10-06T10:00:00Z');
const empty = emptyDraft('nappy', NOW).details;

describe('nappyType', () => {
  it('has no type until one is picked', () => {
    expect(nappyType(empty)).toBeNull();
  });

  it.each([
    [true, true, 'both'],
    [true, false, 'wet'],
    [false, true, 'dirty'],
    [false, false, 'dry'],
  ] as const)('wet=%s dirty=%s is %s', (wet, dirty, expected) => {
    expect(nappyType({ ...empty, typePending: undefined, wet, dirty })).toBe(expected);
  });
});

describe('withNappyType', () => {
  it('picks the type and clears the pending flag', () => {
    const details = withNappyType(empty, 'dry');
    expect(details).not.toHaveProperty('typePending');
    expect(nappyType(details)).toBe('dry');
  });

  it('drops poo details when the nappy is no longer dirty, and wee size when no longer wet', () => {
    const dirty = { ...withNappyType(empty, 'both'), wetSize: 'large' as const, pooSize: 'little' as const };
    const wet = withNappyType({ ...dirty, pooColours: ['mustard'], pooTextures: ['seedy'] }, 'wet');
    expect(wet).toMatchObject({
      wet: true,
      dirty: false,
      wetSize: 'large',
      pooSize: null,
      pooColours: [],
      pooTextures: [],
    });
    expect(withNappyType(dirty, 'dirty')).toMatchObject({ wetSize: null, pooSize: 'little' });
  });
});
