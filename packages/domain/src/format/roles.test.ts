import { describe, expect, it } from 'vitest';
import { MEMBER_ROLES, roleDescription, roleLabel, settingsLockedNote } from './roles';

describe('member roles', () => {
  it('names the owner role Admin and the viewer role Read only', () => {
    expect(MEMBER_ROLES.map(roleLabel)).toEqual(['Admin', 'Caregiver', 'Read only']);
  });

  it('falls back to the raw role for anything unknown', () => {
    expect(roleLabel('guest')).toBe('guest');
  });

  it('describes what each role can do', () => {
    expect(roleDescription('caregiver')).toMatch(/can’t change settings/);
  });

  it('explains locked settings to everyone except admins', () => {
    expect(settingsLockedNote('owner')).toBeNull();
    expect(settingsLockedNote('caregiver')).toMatch(/Only admins/);
    expect(settingsLockedNote('viewer')).toMatch(/read-only/);
    expect(settingsLockedNote(null)).toMatch(/Only admins/);
  });
});
