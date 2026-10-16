import { describe, expect, it } from 'vitest';
import { isTouchPress } from './touch-menu';

describe('isTouchPress', () => {
  it('blocks the menu for a finger or pen but not a mouse right-click', () => {
    expect(isTouchPress('touch', false)).toBe(true);
    expect(isTouchPress('pen', false)).toBe(true);
    expect(isTouchPress('mouse', true)).toBe(false);
  });

  it('falls back to the pointer type of the device when the event has none', () => {
    expect(isTouchPress(undefined, true)).toBe(true);
    expect(isTouchPress('', false)).toBe(false);
  });
});
