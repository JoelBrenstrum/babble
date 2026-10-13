import { describe, expect, it } from 'vitest';
import { formatExpiry, inviteLink, membersHeading, inviteExpiryText, pendingInviteMeta } from './invites';

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
    ).toBe('Read only · by a former member · Expires in 3h');
  });
});

describe('membersHeading', () => {
  it.each([
    [0, 'Members'],
    [1, 'Members · 1 pending'],
    [2, 'Members · 2 pending'],
  ])('%i pending → %s', (count, expected) => expect(membersHeading(count)).toBe(expected));
});

describe('inviteLink', () => {
  it('joins the public url and code', () => {
    expect(inviteLink('https://babble.example', 'K7Q4M-D2XPA')).toBe('https://babble.example/join/K7Q4M-D2XPA');
  });
});

describe('formatExpiry', () => {
  it.each([
    ['2026-10-16T09:00:00Z', 'Expires in 7 days · one use'],
    ['2026-10-10T09:00:00Z', 'Expires in 1 day · one use'],
    ['2026-10-09T12:00:00Z', 'Expires in 1 day · one use'],
    ['2026-10-08T09:00:00Z', 'Expires in 1 day · one use'],
  ])('%s → %s', (expiresAt, expected) => expect(formatExpiry(expiresAt, now)).toBe(expected));
});
