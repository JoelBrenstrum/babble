import { describe, expect, it } from 'vitest';
import { priorsForAge } from './age-priors';

const M = 60_000;

describe('priorsForAge', () => {
  it('gives a newborn a short wake window', () => {
    expect(priorsForAge(0.5).wakeToSleep).toEqual({ low: 35 * M, mid: 45 * M, high: 60 * M });
  });

  it('lengthens the wake window with age', () => {
    const ages = [0, 1, 2, 3, 4, 6, 9, 12, 18];
    const windows = ages.map((age) => priorsForAge(age).wakeToSleep.mid);
    expect([...windows].sort((a, b) => a - b)).toEqual(windows);
    expect(new Set(windows).size).toBe(ages.length);
  });

  it('treats an age before birth as a newborn and caps old toddlers at the last band', () => {
    expect(priorsForAge(-1)).toEqual(priorsForAge(0));
    expect(priorsForAge(48)).toEqual(priorsForAge(36));
  });

  it('keeps every band ordered low, mid, high', () => {
    for (const age of [0, 1.5, 2.5, 3.5, 5, 8, 11, 15, 24]) {
      for (const prior of Object.values(priorsForAge(age))) {
        expect(prior.low).toBeLessThanOrEqual(prior.mid);
        expect(prior.mid).toBeLessThanOrEqual(prior.high);
      }
    }
  });
});
