import { describe, expect, it } from 'vitest';
import { keepAwakeHint, parseKeepAwake, serialiseKeepAwake } from './keep-awake';

describe('keep awake preference', () => {
  it('round-trips through storage and defaults to off', () => {
    expect(parseKeepAwake(serialiseKeepAwake(true))).toBe(true);
    expect(serialiseKeepAwake(false)).toBeNull();
    expect(parseKeepAwake(null)).toBe(false);
    expect(parseKeepAwake('yes')).toBe(false);
  });
});

describe('keepAwakeHint', () => {
  it('mentions the battery only when the device reports it', () => {
    expect(keepAwakeHint(false, true)).toBe('Let the screen sleep as usual.');
    expect(keepAwakeHint(true, true)).toBe('Stays on while this screen is open. Plugged in.');
    expect(keepAwakeHint(true, false)).toBe('Stays on while this screen is open. On battery, so plug in if you can.');
    expect(keepAwakeHint(true, null)).toBe('Stays on while this screen is open.');
  });
});
