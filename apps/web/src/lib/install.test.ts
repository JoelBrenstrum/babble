import { describe, expect, it } from 'vitest';
import { INSTALL_SNOOZE_MS, installMode, installSnoozed, showInstallCard, type InstallEnvironment } from './install';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
};

const env = (overrides: Partial<InstallEnvironment>): InstallEnvironment => ({
  userAgent: UA.androidChrome,
  maxTouchPoints: 0,
  standalone: false,
  installed: false,
  canPrompt: false,
  ...overrides,
});

describe('installMode', () => {
  it.each([
    ['iPhone Safari', env({ userAgent: UA.iphoneSafari, maxTouchPoints: 5 }), 'ios-safari'],
    ['iPhone Chrome', env({ userAgent: UA.iphoneChrome, maxTouchPoints: 5 }), 'ios-other'],
    ['iPhone Firefox', env({ userAgent: UA.iphoneFirefox, maxTouchPoints: 5 }), 'ios-other'],
    ['iPad in desktop mode', env({ userAgent: UA.macSafari, maxTouchPoints: 5 }), 'ios-safari'],
    ['Mac Safari', env({ userAgent: UA.macSafari }), 'none'],
    ['Android Chrome with a prompt', env({ canPrompt: true }), 'prompt'],
    ['Android Chrome without a prompt', env({}), 'none'],
    ['standalone on iPhone', env({ userAgent: UA.iphoneSafari, standalone: true }), 'installed'],
    ['standalone on Android', env({ standalone: true, canPrompt: true }), 'installed'],
    ['installed from this browser', env({ installed: true }), 'installed'],
  ] as const)('%s → %s', (_, input, expected) => {
    expect(installMode(input)).toBe(expected);
  });
});

describe('installSnoozed', () => {
  const now = new Date('2026-10-09T12:00:00Z');

  it('is not snoozed without a dismissal', () => {
    expect(installSnoozed(null, now)).toBe(false);
    expect(installSnoozed('garbage', now)).toBe(false);
  });

  it('stays snoozed for 14 days after a dismissal', () => {
    expect(installSnoozed('2026-10-09T11:00:00Z', now)).toBe(true);
    expect(installSnoozed(new Date(now.getTime() - INSTALL_SNOOZE_MS + 1).toISOString(), now)).toBe(true);
    expect(installSnoozed(new Date(now.getTime() - INSTALL_SNOOZE_MS).toISOString(), now)).toBe(false);
  });

  it('ignores a dismissal dated in the future', () => {
    expect(installSnoozed('2026-11-01T00:00:00Z', now)).toBe(false);
  });
});

describe('showInstallCard', () => {
  const now = new Date('2026-10-09T12:00:00Z');

  it.each([
    ['ios-safari', true],
    ['ios-other', true],
    ['prompt', true],
    ['none', false],
    ['installed', false],
  ] as const)('%s → %s', (mode, expected) => {
    expect(showInstallCard(mode, null, now)).toBe(expected);
  });

  it('hides while snoozed', () => {
    expect(showInstallCard('prompt', '2026-10-01T00:00:00Z', now)).toBe(false);
  });
});
