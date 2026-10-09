import { describe, expect, it } from 'vitest';
import { signedOutRedirect, type EntryEnvironment } from './entry';

const env = (overrides: Partial<EntryEnvironment>): EntryEnvironment => ({
  signedIn: false,
  standalone: false,
  pendingInvite: null,
  ...overrides,
});

describe('signedOutRedirect', () => {
  it.each([
    ['signed out in a browser', env({}), '/welcome'],
    ['signed out in the installed app', env({ standalone: true }), '/sign-in'],
    ['signed out with an invite waiting', env({ pendingInvite: 'ABCDE-FGHJK' }), '/sign-in'],
    [
      'signed out in the installed app with an invite',
      env({ standalone: true, pendingInvite: 'ABCDE-FGHJK' }),
      '/sign-in',
    ],
    ['signed in', env({ signedIn: true }), null],
    ['signed in in the installed app', env({ signedIn: true, standalone: true }), null],
  ] as const)('%s → %s', (_, input, expected) => {
    expect(signedOutRedirect(input)).toBe(expected);
  });
});
