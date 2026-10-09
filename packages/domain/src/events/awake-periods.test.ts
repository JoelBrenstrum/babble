import { describe, expect, it } from 'vitest';
import { emptyDraft } from './drafts';
import { validateDraft } from './validate';
import {
  awakePeriods,
  napDurationText,
  newAwakePeriod,
  stretchesError,
  stretchesWithAwake,
  trimAwakePeriod,
} from './awake-periods';

const START = '2026-10-06T09:00:00.000Z';
const END = '2026-10-06T11:00:00.000Z';
const at = (minutes: number) => new Date(Date.parse(START) + minutes * 60_000).toISOString();

describe('awakePeriods', () => {
  it('reads the gaps between stretches of sleep', () => {
    const stretches = [
      { startedAt: START, endedAt: at(40) },
      { startedAt: at(50), endedAt: at(90) },
      { startedAt: at(95), endedAt: END },
    ];
    expect(awakePeriods(stretches, START, END)).toEqual([
      { wokeAt: at(40), asleepAt: at(50) },
      { wokeAt: at(90), asleepAt: at(95) },
    ]);
  });

  it('has none for a nap without stretches', () => {
    expect(awakePeriods([], START, END)).toEqual([]);
  });
});

describe('stretchesWithAwake', () => {
  it('turns wake-ups back into stretches covering the whole nap, in order', () => {
    expect(
      stretchesWithAwake(START, END, [
        { wokeAt: at(90), asleepAt: at(95) },
        { wokeAt: at(40), asleepAt: at(50) },
      ]),
    ).toEqual([
      { startedAt: START, endedAt: at(40) },
      { startedAt: at(50), endedAt: at(90) },
      { startedAt: at(95), endedAt: END },
    ]);
    expect(stretchesWithAwake(START, END, [])).toEqual([]);
  });

  it('round-trips through awakePeriods', () => {
    const periods = [{ wokeAt: at(30), asleepAt: at(42) }];
    expect(awakePeriods(stretchesWithAwake(START, END, periods), START, END)).toEqual(periods);
  });
});

describe('newAwakePeriod', () => {
  it('adds ten minutes awake in the middle of the longest stretch', () => {
    expect(newAwakePeriod(START, END, [])).toEqual({ wokeAt: at(55), asleepAt: at(65) });
    expect(newAwakePeriod(START, END, [{ wokeAt: at(20), asleepAt: at(30) }])).toEqual({
      wokeAt: at(70),
      asleepAt: at(80),
    });
  });

  it('keeps short naps mostly asleep', () => {
    expect(newAwakePeriod(START, at(15), [])).toEqual({ wokeAt: at(5), asleepAt: at(10) });
  });
});

describe('stretchesError', () => {
  it('accepts stretches built from valid wake-ups and naps without any', () => {
    expect(
      stretchesError(stretchesWithAwake(START, END, [{ wokeAt: at(30), asleepAt: at(40) }]), START, END),
    ).toBeNull();
    expect(stretchesError([], START, END)).toBeNull();
  });

  it('rejects stretches from wake-ups that overlap, run backwards or sit outside the nap', () => {
    const overlapping = stretchesWithAwake(START, END, [
      { wokeAt: at(30), asleepAt: at(40) },
      { wokeAt: at(35), asleepAt: at(45) },
    ]);
    expect(stretchesError(overlapping, START, END)).toBe('Check the wake-up times.');
    expect(stretchesError(stretchesWithAwake(START, END, [{ wokeAt: at(30), asleepAt: at(20) }]), START, END)).toBe(
      'Check the wake-up times.',
    );
    expect(stretchesError(stretchesWithAwake(START, END, [{ wokeAt: at(30), asleepAt: at(40) }]), at(35), END)).toBe(
      'Wake-ups must be after the nap started.',
    );
    expect(stretchesError(stretchesWithAwake(START, END, [{ wokeAt: at(30), asleepAt: at(40) }]), START, at(35))).toBe(
      'Wake-ups must be before the nap ended.',
    );
  });
});

describe('saving a nap with wake-ups', () => {
  it('stops a save until the wake-ups make sense', () => {
    const nap = { ...emptyDraft('sleep', new Date(END)), startedAt: START, endedAt: END };
    const bad = { ...nap, segments: stretchesWithAwake(START, END, [{ wokeAt: at(30), asleepAt: at(20) }]) };
    const good = { ...nap, segments: stretchesWithAwake(START, END, [{ wokeAt: at(30), asleepAt: at(40) }]) };
    expect(validateDraft(bad, new Date(END)).awake).toBe('Check the wake-up times.');
    expect(validateDraft(good, new Date(END)).awake).toBeUndefined();
  });
});

describe('napDurationText', () => {
  it('splits the nap into time asleep and time awake', () => {
    expect(napDurationText(START, END, [{ wokeAt: at(30), asleepAt: at(42) }])).toEqual({
      asleep: '1h 48m',
      awake: '12m',
    });
    expect(napDurationText(START, END, [])).toEqual({ asleep: '2h 00m', awake: null });
    expect(napDurationText(END, START, [])).toBeNull();
  });
});

describe('trimAwakePeriod', () => {
  it('takes a minute off a wake-up and removes it once nothing is left', () => {
    const periods = [
      { wokeAt: at(30), asleepAt: at(32) },
      { wokeAt: at(60), asleepAt: at(70) },
    ];
    expect(trimAwakePeriod(periods, 1)).toEqual([periods[0], { wokeAt: at(60), asleepAt: at(69) }]);
    expect(trimAwakePeriod(trimAwakePeriod(periods, 0), 0)).toEqual([periods[1]]);
  });
});
