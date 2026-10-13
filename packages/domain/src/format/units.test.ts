import { describe, expect, it } from 'vitest';
import {
  formatLength,
  formatVolume,
  formatVolumeValue,
  formatWeight,
  formatWeightChange,
  ML_PER_OUNCE,
  lengthToMm,
  volumeToMl,
  volumeUnit,
  weightToGrams,
} from './units';

describe('volume', () => {
  it('formats the number without its unit', () => {
    expect(formatVolumeValue(119.6, 'metric')).toBe('120');
    expect(formatVolumeValue(118, 'imperial')).toBe('4');
    expect(formatVolumeValue(133, 'imperial')).toBe('4.5');
  });

  it('names the unit', () => {
    expect(volumeUnit('metric')).toBe('ml');
    expect(volumeUnit('imperial')).toBe('oz');
  });

  it('builds formatVolume from the two', () => {
    for (const units of ['metric', 'imperial'] as const) {
      expect(formatVolume(150, units)).toBe(`${formatVolumeValue(150, units)} ${volumeUnit(units)}`);
    }
  });

  it('round-trips ounces', () => {
    expect(volumeToMl(1, 'imperial')).toBe(Math.round(ML_PER_OUNCE));
    expect(volumeToMl(4.5, 'imperial')).toBe(133);
  });
});

describe('formatWeightChange', () => {
  it.each([
    [120, 'metric', '+120 g'],
    [-80, 'metric', '−80 g'],
    [1250, 'metric', '+1.25 kg'],
    [0.2, 'metric', '0 g'],
    [100, 'imperial', '+4 oz'],
    [-600, 'imperial', '−1 lb 5 oz'],
    [5, 'imperial', '0 oz'],
  ] as const)('%i g in %s → %s', (grams, units, expected) => expect(formatWeightChange(grams, units)).toBe(expected));
});

describe('conversions', () => {
  it('trims a trailing zero from lengths', () => {
    expect(formatLength(500, 'metric')).toBe('50 cm');
    expect(formatLength(254, 'imperial')).toBe('10 in');
  });

  it('rounds typed measurements to whole grams and millimetres', () => {
    expect(weightToGrams(3.9504, 'metric')).toBe(3950);
    expect(lengthToMm(50.04, 'metric')).toBe(500);
    expect(formatWeight(500, 'metric')).toBe('0.50 kg');
  });
});
