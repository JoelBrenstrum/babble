import { describe, expect, it } from 'vitest';
import { caregiversHeading, inviteExpiryText, pendingInviteMeta } from './invites';

const now = new Date('2026-10-09T09:00:00Z');

describe('inviteExpiryText', () => {
  it.each([
    ['2026-10-16T08:59:00Z', 'Expires in 7 days'],
    ['2026-10-15T09:00:00Z', 'Expires in 6 days'],
    ['2026-10-10T09:00:00Z', 'Expires in 1 day'],
    ['2026-10-10T08:00:00Z', 'Expires in 23h'],
    ['2026-10-09T12:30:00Z', 'Expires in 3h'],
    ['2026-10-09T09:45:00Z', 'Expires in 45m'],
    ['2026-10-09T09:00:20Z', 'Expires in 1m'],
    ['2026-10-09T09:00:00Z', 'Expired'],
  ])('%s → %s', (expiresAt, expected) => expect(inviteExpiryText(expiresAt, now)).toBe(expected));
});

describe('pendingInviteMeta', () => {
  const names = new Map([['user-john', 'John']]);

  it('shows the role, who created it and when it expires', () => {
    expect(
      pendingInviteMeta({ role: 'caregiver', createdBy: 'user-john', expiresAt: '2026-10-15T09:00:00Z' }, names, now),
    ).toBe('Caregiver · by John · Expires in 6 days');
  });

  it('handles invites made by members who have left', () => {
    expect(
      pendingInviteMeta({ role: 'viewer', createdBy: 'user-gone', expiresAt: '2026-10-09T12:30:00Z' }, names, now),
    ).toBe('Viewer · by a former member · Expires in 3h');
  });
});

describe('caregiversHeading', () => {
  it.each([
    [0, 'Caregivers'],
    [1, 'Caregivers · 1 pending'],
    [2, 'Caregivers · 2 pending'],
  ])('%i pending → %s', (count, expected) => expect(caregiversHeading(count)).toBe(expected));
});
