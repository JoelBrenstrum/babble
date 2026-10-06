import { describe, expect, it } from 'vitest';
import { canEdit, memberRole, resolveOnboarding } from './onboarding';
import type { BabyRow, Family } from './types';

const baby = (id: string): BabyRow => ({
  id,
  family_id: 'f',
  name: id,
  birth_date: '2026-09-26',
  timezone: 'Pacific/Auckland',
  day_start_minutes: 0,
  created_at: '',
  updated_at: '',
});

const family = (id: string, babies: BabyRow[] = []): Family => ({
  id,
  name: id,
  plan: 'free',
  created_at: '',
  babies,
  members: [
    { family_id: id, user_id: 'joel', role: 'owner', display_name: 'Joel', created_at: '' },
    { family_id: id, user_id: 'gran', role: 'viewer', display_name: 'Gran', created_at: '' },
  ],
});

describe('resolveOnboarding', () => {
  it('asks signed-out users to sign in', () => {
    expect(resolveOnboarding({ signedIn: false, families: [] })).toEqual({ step: 'sign-in' });
  });

  it('asks for a family when the user has none', () => {
    expect(resolveOnboarding({ signedIn: true, families: [] })).toEqual({ step: 'family' });
  });

  it('asks for a baby when the family has none', () => {
    const f = family('f1');
    expect(resolveOnboarding({ signedIn: true, families: [f] })).toEqual({ step: 'baby', family: f });
  });

  it('is ready with the first baby by default', () => {
    const a = baby('a');
    const f = family('f1', [a, baby('b')]);
    expect(resolveOnboarding({ signedIn: true, families: [f] })).toEqual({ step: 'ready', family: f, baby: a });
  });

  it('prefers a family that has babies', () => {
    const empty = family('empty');
    const withBaby = family('full', [baby('a')]);
    expect(resolveOnboarding({ signedIn: true, families: [empty, withBaby] })).toMatchObject({ family: withBaby });
  });

  it('honours the active family and baby', () => {
    const b = baby('b');
    const f2 = family('f2', [baby('a'), b]);
    expect(
      resolveOnboarding({
        signedIn: true,
        families: [family('f1', [baby('x')]), f2],
        activeFamilyId: 'f2',
        activeBabyId: 'b',
      }),
    ).toEqual({ step: 'ready', family: f2, baby: b });
  });

  it('falls back when the active ids are stale', () => {
    const a = baby('a');
    const f = family('f1', [a]);
    expect(resolveOnboarding({ signedIn: true, families: [f], activeFamilyId: 'gone', activeBabyId: 'gone' })).toEqual({
      step: 'ready',
      family: f,
      baby: a,
    });
  });
});

describe('roles', () => {
  it('reads a member role', () => {
    expect(memberRole(family('f'), 'gran')).toBe('viewer');
    expect(memberRole(family('f'), 'nobody')).toBeNull();
  });

  it('lets owners and caregivers edit', () => {
    expect(canEdit(family('f'), 'joel')).toBe(true);
    expect(canEdit(family('f'), 'gran')).toBe(false);
  });
});
