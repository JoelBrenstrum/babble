import { describe, expect, it } from 'vitest';
import { formatAgo, formatDuration, formatTimer } from './duration';
import { formatLength, formatVolume, formatWeight, lengthToMm, volumeToMl, weightToGrams } from './units';

describe('formatDuration', () => {
  it.each([
    [0, {}, '0s'],
    [45_000, {}, '45s'],
    [632_000, {}, '10m 32s'],
    [632_000, { seconds: false }, '10m'],
    [4_320_000, {}, '1h 12m'],
    [4_325_000, { seconds: true }, '1h 12m 05s'],
    [-5000, {}, '0s'],
    [30_000, { seconds: false }, '0m'],
  ])('%i ms %j → %s', (ms, options, expected) => expect(formatDuration(ms, options)).toBe(expected));
});

describe('formatTimer', () => {
  it.each([
    [0, '0:00'],
    [743_000, '12:23'],
    [3_723_000, '1:02:03'],
  ])('%i → %s', (ms, expected) => expect(formatTimer(ms)).toBe(expected));
});

describe('formatAgo', () => {
  it.each([
    [10_000, 'just now'],
    [2_880_000, '48m ago'],
    [8_040_000, '2h 14m ago'],
    [90_000_000, '1 day ago'],
    [345_600_000, '4 days ago'],
  ])('%i → %s', (ms, expected) => expect(formatAgo(ms)).toBe(expected));
});

describe('units', () => {
  it('formats metric and imperial', () => {
    expect(formatWeight(3950, 'metric')).toBe('3.95 kg');
    expect(formatWeight(3950, 'imperial')).toBe('8 lb 11 oz');
    expect(formatLength(510, 'metric')).toBe('51 cm');
    expect(formatLength(515, 'metric')).toBe('51.5 cm');
    expect(formatLength(508, 'imperial')).toBe('20 in');
    expect(formatVolume(120, 'metric')).toBe('120 ml');
    expect(formatVolume(118, 'imperial')).toBe('4 oz');
  });

  it('converts input back to metric', () => {
    expect(volumeToMl(4, 'imperial')).toBe(118);
    expect(volumeToMl(90, 'metric')).toBe(90);
    expect(weightToGrams(3.95, 'metric')).toBe(3950);
    expect(weightToGrams(8.5, 'imperial')).toBe(3856);
    expect(lengthToMm(51, 'metric')).toBe(510);
    expect(lengthToMm(20, 'imperial')).toBe(508);
  });
});
