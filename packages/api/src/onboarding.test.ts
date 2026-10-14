import { describe, expect, it } from 'vitest';
import {
  babyChoices,
  adminCount,
  authorName,
  canChangeRole,
  canLog,
  canRemoveMember,
  canRenameMember,
  memberNameError,
  isAdmin,
  memberRole,
  resolveOnboarding,
} from './onboarding';
import type { BabyRow, Family } from './types';

const baby = (id: string): BabyRow => ({
  id,
  family_id: 'f',
  name: id,
  birth_date: '2026-09-26',
  timezone: 'Pacific/Auckland',
  day_start_minutes: 0,
  sex: null,
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
    { family_id: id, user_id: 'john', role: 'owner', display_name: 'John', created_at: '' },
    { family_id: id, user_id: 'gran', role: 'viewer', display_name: 'Gran', created_at: '' },
    { family_id: id, user_id: 'jane', role: 'caregiver', display_name: 'Jane', created_at: '' },
  ],
  former_members: [{ family_id: id, user_id: 'chair', display_name: 'Chair', removed_at: '' }],
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

  it('lets admins and caregivers log entries but not read-only members', () => {
    expect(canLog(family('f'), 'john')).toBe(true);
    expect(canLog(family('f'), 'jane')).toBe(true);
    expect(canLog(family('f'), 'gran')).toBe(false);
    expect(canLog(family('f'), 'nobody')).toBe(false);
  });

  it('treats only the owner role as admin', () => {
    expect(isAdmin(family('f'), 'john')).toBe(true);
    expect(isAdmin(family('f'), 'jane')).toBe(false);
    expect(isAdmin(family('f'), 'gran')).toBe(false);
    expect(adminCount(family('f'))).toBe(1);
  });

  it('lets admins change the role of anyone in the family', () => {
    expect(canChangeRole(family('f'), 'john', 'jane')).toBe(true);
    expect(canChangeRole(family('f'), 'john', 'john')).toBe(true);
    expect(canChangeRole(family('f'), 'jane', 'gran')).toBe(false);
    expect(canChangeRole(family('f'), 'john', 'nobody')).toBe(false);
  });

  it('lets owners rename anyone and members rename themselves', () => {
    expect(canRenameMember(family('f'), 'john', 'gran')).toBe(true);
    expect(canRenameMember(family('f'), 'gran', 'gran')).toBe(true);
    expect(canRenameMember(family('f'), 'gran', 'john')).toBe(false);
  });

  it('lets owners remove other members but not themselves', () => {
    expect(canRemoveMember(family('f'), 'john', 'gran')).toBe(true);
    expect(canRemoveMember(family('f'), 'john', 'john')).toBe(false);
    expect(canRemoveMember(family('f'), 'gran', 'john')).toBe(false);
    expect(canRemoveMember(family('f'), 'john', 'nobody')).toBe(false);
  });

  it('checks a member name', () => {
    expect(memberNameError('  Nana ')).toBeNull();
    expect(memberNameError('   ')).toBe('Enter a name.');
    expect(memberNameError('x'.repeat(61))).toBe('Keep it under 60 characters.');
  });
});

describe('babyChoices', () => {
  it('lists every baby across families, oldest first within a family', () => {
    const older = { ...baby('jacob'), birth_date: '2025-08-01' };
    const younger = baby('olivia');
    const choices = babyChoices([family('smiths', [younger, older]), family('grandparents', [baby('cousin')])]);
    expect(choices.map((choice) => [choice.familyName, choice.baby.name])).toEqual([
      ['smiths', 'jacob'],
      ['smiths', 'olivia'],
      ['grandparents', 'cousin'],
    ]);
  });

  it('is empty without babies', () => {
    expect(babyChoices([family('empty')])).toEqual([]);
  });
});

describe('authorName', () => {
  it('names current and former members', () => {
    expect(authorName(family('f'), 'jane')).toBe('Jane');
    expect(authorName(family('f'), 'chair')).toBe('Chair');
  });

  it('has no name for unknown or missing authors', () => {
    expect(authorName(family('f'), 'stranger')).toBeUndefined();
    expect(authorName(family('f'), null)).toBeUndefined();
  });
});
