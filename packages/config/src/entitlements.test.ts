import { describe, expect, it } from 'vitest';
import {
  ALL_FEATURES,
  canAddBaby,
  canInviteCarer,
  entitlements,
  familyHasFeature,
  planSummary,
  plusPitch,
} from './entitlements';

describe('entitlements', () => {
  it('unlocks everything when billing is off, whatever the plan', () => {
    expect([...entitlements({ billingEnabled: false, plan: 'free' })]).toEqual(ALL_FEATURES);
  });

  it('limits the free plan when billing is on', () => {
    const features = entitlements({ billingEnabled: true, plan: 'free' });
    expect(features.has('core_tracking')).toBe(true);
    expect(features.has('stats')).toBe(true);
    expect(features.has('multiple_babies')).toBe(false);
  });

  it('unlocks everything on the plus plan', () => {
    expect([...entitlements({ billingEnabled: true, plan: 'plus' })]).toEqual(ALL_FEATURES);
  });

  it('keeps predictions for plus families when billing is on', () => {
    expect(familyHasFeature(true, 'plus', 'predictions')).toBe(true);
    expect(familyHasFeature(true, 'free', 'predictions')).toBe(false);
    expect(familyHasFeature(true, 'unknown', 'predictions')).toBe(false);
    expect(familyHasFeature(false, 'free', 'predictions')).toBe(true);
  });
});

describe('planSummary', () => {
  it('is hidden when billing is off', () => {
    expect(planSummary(false, 'plus')).toBeNull();
  });

  it('describes plus and free families', () => {
    expect(planSummary(true, 'plus')).toMatchObject({ plus: true, status: expect.stringContaining('has Plus') });
    expect(planSummary(true, 'free')).toMatchObject({ plus: false, status: expect.stringContaining('free plan') });
    expect(planSummary(true, 'free')!.highlights).toContain('Predicted sleeps and feeds on Home and the Timeline');
  });
});

describe('canAddBaby', () => {
  it('always allows the first baby', () => {
    expect(canAddBaby(true, 'free', 0)).toBe(true);
  });

  it('needs plus for a second baby when billing is on', () => {
    expect(canAddBaby(true, 'free', 1)).toBe(false);
    expect(canAddBaby(true, 'plus', 1)).toBe(true);
    expect(canAddBaby(false, 'free', 3)).toBe(true);
  });
});

describe('plusPitch', () => {
  it('explains why the feature is locked and what plus includes', () => {
    expect(plusPitch('multiple_babies')).toEqual({
      reason: 'Adding more than one baby to a family is part of Babble Plus.',
      highlights: [
        'Predicted sleeps and feeds on Home and the Timeline',
        'More than one baby in a family',
        'More than two carers in a family',
      ],
      note: 'Upgrading is coming soon.',
    });
  });
});

describe('canInviteCarer', () => {
  it('lets a free family invite until it has two carers, counting pending invites', () => {
    expect(canInviteCarer(true, 'free', 1, 0)).toBe(true);
    expect(canInviteCarer(true, 'free', 1, 1)).toBe(false);
    expect(canInviteCarer(true, 'free', 2, 0)).toBe(false);
  });

  it('has no limit on plus or with billing off', () => {
    expect(canInviteCarer(true, 'plus', 4, 2)).toBe(true);
    expect(canInviteCarer(false, 'free', 4, 2)).toBe(true);
  });
});
