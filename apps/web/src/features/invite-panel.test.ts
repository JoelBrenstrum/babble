import { describe, expect, it } from 'vitest';
import { formatExpiry, inviteLink } from './invite-panel';

describe('inviteLink', () => {
  it('points at the join route', () => {
    expect(inviteLink('https://babble.fly.dev', 'K7Q-4MD')).toBe('https://babble.fly.dev/join/K7Q-4MD');
  });
});

describe('formatExpiry', () => {
  const now = new Date('2026-10-07T00:00:00Z');
  it.each([
    ['2026-10-14T00:00:00Z', 'Expires in 7 days · one use'],
    ['2026-10-08T01:00:00Z', 'Expires in 1 day · one use'],
    ['2026-10-07T02:00:00Z', 'Expires in 1 day · one use'],
  ])('%s → %s', (expiresAt, expected) => expect(formatExpiry(expiresAt, now)).toBe(expected));
});
