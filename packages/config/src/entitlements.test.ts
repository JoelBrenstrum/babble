import { describe, expect, it } from 'vitest';
import {
  ALL_FEATURES,
  canAddBaby,
  canInviteCarer,
  canSaveReport,
  entitlements,
  familyEntitlements,
  toPlan,
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
    expect(planSummary(true, 'free')!.highlights).toContain(
      'Sleep windows and predicted feeds on Home and the Timeline',
    );
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
  it('explains the chair mode lock', () => {
    expect(plusPitch('chair_mode').reason).toBe('Chair mode is part of Babble Plus. You can preview it from Settings.');
    expect(familyHasFeature(true, 'free', 'chair_mode')).toBe(false);
    expect(familyHasFeature(true, 'plus', 'chair_mode')).toBe(true);
  });

  it('explains the insights lock', () => {
    expect(plusPitch('insights').reason).toContain('30-day timeline');
  });

  it('explains why the feature is locked and what plus includes', () => {
    expect(plusPitch('multiple_babies')).toEqual({
      reason: 'Adding more than one baby to a family is part of Babble Plus.',
      highlights: [
        'Sleep windows and predicted feeds on Home and the Timeline',
        "An estimate of today's weight, length and head size",
        'More than one baby in a family',
        'More than two carers in a family',
        'Wake windows, night sleep, a weekly summary and all-time stats',
        'Breastfeed trends: time per feed, per side and idle',
        'Feed spacing: how far apart feeds are, day and night',
        'Cluster feeding: when feeds bunch up, and what time of day',
        'A 30-day timeline to see patterns form',
        'Chair mode, a feed station for a tablet by the feeding chair',
        'Unlimited saved reports and reports over 90 days, 6 months or all time',
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

describe('canSaveReport', () => {
  it('lets a free family save two reports and a plus family any number', () => {
    expect(canSaveReport(true, 'free', 0)).toBe(true);
    expect(canSaveReport(true, 'free', 1)).toBe(true);
    expect(canSaveReport(true, 'free', 2)).toBe(false);
    expect(canSaveReport(true, 'plus', 20)).toBe(true);
    expect(canSaveReport(false, 'free', 20)).toBe(true);
  });
});

describe('toPlan', () => {
  it('narrows unknown plan names to free', () => {
    expect(toPlan('plus')).toBe('plus');
    expect(toPlan('free')).toBe('free');
    expect(toPlan('enterprise')).toBe('free');
  });
});

describe('familyEntitlements', () => {
  it('answers feature and limit questions for one family', () => {
    const free = familyEntitlements(true, 'free');
    expect(free.plan).toBe('free');
    expect(free.has('predictions')).toBe(false);
    expect(free.canAddBaby(1)).toBe(false);
    expect(free.canInviteCarer(1, 1)).toBe(false);
    const plus = familyEntitlements(true, 'plus');
    expect(plus.has('predictions')).toBe(true);
    expect(plus.canAddBaby(3)).toBe(true);
    expect(plus.canInviteCarer(4, 2)).toBe(true);
    expect(familyEntitlements(false, 'free').has('chair_mode')).toBe(true);
  });
});
