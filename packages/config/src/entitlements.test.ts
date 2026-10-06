import { describe, expect, it } from 'vitest';
import { ALL_FEATURES, entitlements } from './entitlements';

describe('entitlements', () => {
  it('unlocks everything when billing is off, whatever the plan', () => {
    expect([...entitlements({ billingEnabled: false, plan: 'free' })]).toEqual(ALL_FEATURES);
  });

  it('limits the free plan when billing is on', () => {
    const features = entitlements({ billingEnabled: true, plan: 'free' });
    expect(features.has('core_tracking')).toBe(true);
    expect(features.has('stats')).toBe(false);
  });

  it('unlocks everything on the plus plan', () => {
    expect([...entitlements({ billingEnabled: true, plan: 'plus' })]).toEqual(ALL_FEATURES);
  });
});
