import { afterEach, describe, expect, it, vi } from 'vitest';
import { opensPicker, showNativePicker } from './native-picker';

const touch = (coarse: boolean) => {
  window.matchMedia = ((query: string) => ({ matches: coarse, media: query })) as typeof window.matchMedia;
};

describe('opensPicker', () => {
  it('is true for date and time inputs only', () => {
    expect(['date', 'time', 'datetime-local'].map(opensPicker)).toEqual([true, true, true]);
    expect(['text', 'number', undefined].map(opensPicker)).toEqual([false, false, false]);
  });
});

describe('showNativePicker', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens the picker on touch screens', () => {
    touch(true);
    const input = document.createElement('input');
    input.showPicker = vi.fn();
    showNativePicker(input);
    expect(input.showPicker).toHaveBeenCalled();
  });

  it('leaves mouse users typing into the field', () => {
    touch(false);
    const input = document.createElement('input');
    input.showPicker = vi.fn();
    showNativePicker(input);
    expect(input.showPicker).not.toHaveBeenCalled();
  });

  it('ignores browsers where the picker throws', () => {
    touch(true);
    const input = document.createElement('input');
    input.showPicker = () => {
      throw new DOMException('NotAllowedError');
    };
    expect(() => showNativePicker(input)).not.toThrow();
  });
});
