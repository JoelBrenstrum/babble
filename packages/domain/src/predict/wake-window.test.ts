import { describe, expect, it } from 'vitest';
import {
  adjustWakeRange,
  isRoutineAge,
  nightTotals,
  shortNapCut,
  wakeContext,
  wakeWindowText,
  type SleepSpan,
  type WakeWindow,
} from './wake-window';

const M = 60_000;
const H = 60 * M;
const TZ = 'Pacific/Auckland';
const RANGE = { low: 100 * M, mid: 120 * M, high: 140 * M };

const span = (startHours: number, lengthMinutes: number, night = false): SleepSpan => ({
  start: startHours * H,
  end: startHours * H + lengthMinutes * M,
  night,
});

const night = (day: number, hours: number) => span(day * 24 - 5, hours * 60, true);

describe('isRoutineAge', () => {
  it('starts at thirteen weeks and assumes a routine when the age is unknown', () => {
    expect(isRoutineAge(2.9)).toBe(false);
    expect(isRoutineAge(3)).toBe(true);
    expect(isRoutineAge(null)).toBe(true);
  });
});

describe('shortNapCut', () => {
  it('leaves the window alone after a nap of an hour or more', () => {
    expect(shortNapCut(60 * M)).toBe(0);
    expect(shortNapCut(150 * M)).toBe(0);
  });

  it('cuts more the shorter the nap, up to thirty percent', () => {
    expect(shortNapCut(45 * M)).toBeCloseTo(0.1125);
    expect(shortNapCut(30 * M)).toBeCloseTo(0.225);
    expect(shortNapCut(20 * M)).toBeCloseTo(0.3);
    expect(shortNapCut(5 * M)).toBeCloseTo(0.3);
  });
});

describe('nightTotals', () => {
  it('adds up the stretches of one night and keeps nights apart', () => {
    const sleeps = [span(0, 240, true), span(5, 300, true), span(13, 60), span(24, 600, true)];
    expect(nightTotals(sleeps)).toEqual([540 * M, 600 * M]);
  });

  it('splits two nights with no nap logged between them', () => {
    expect(nightTotals([span(0, 600, true), span(24, 540, true)])).toEqual([600 * M, 540 * M]);
  });
});

describe('wakeContext', () => {
  it('has nothing to adjust after a night sleep', () => {
    expect(wakeContext([night(1, 11)])).toEqual({ napMs: null, shortNapsToday: 0, goodNight: false });
    expect(wakeContext([])).toEqual({ napMs: null, shortNapsToday: 0, goodNight: false });
  });

  it('counts the short naps since the night and measures the last one', () => {
    const context = wakeContext([night(1, 8), span(33, 30), span(36, 90), span(39, 40)]);
    expect(context).toEqual({ napMs: 40 * M, shortNapsToday: 2, goodNight: false });
  });

  it('calls ten hours a good night before it knows the usual night', () => {
    expect(wakeContext([night(1, 10), span(33, 30)]).goodNight).toBe(true);
    expect(wakeContext([night(1, 9.5), span(33, 30)]).goodNight).toBe(false);
  });

  it('compares the night with the usual one once it has three to go on', () => {
    const usual = [night(1, 11), span(33, 90), night(2, 11), span(57, 90), night(3, 11), span(81, 90)];
    expect(wakeContext([...usual, night(4, 10.5), span(105, 30)]).goodNight).toBe(false);
    expect(wakeContext([...usual, night(4, 11), span(105, 30)]).goodNight).toBe(true);
  });

  it('never calls a night under nine hours good, however short the usual one', () => {
    const rough = [night(1, 7), span(33, 90), night(2, 7), span(57, 90), night(3, 7), span(81, 90)];
    expect(wakeContext([...rough, night(4, 8), span(105, 30)]).goodNight).toBe(false);
    expect(wakeContext([...rough, night(4, 9), span(105, 30)]).goodNight).toBe(true);
  });

  it('judges the latest night alone when no nap was logged the day before', () => {
    const sleeps = [span(19, 13 * 60, true), span(43, 8 * 60, true), span(54, 30)];
    expect(nightTotals(sleeps)).toEqual([13 * H, 8 * H]);
    expect(wakeContext(sleeps).goodNight).toBe(false);
  });

  it('does not credit a night when the naps have no night before them', () => {
    expect(wakeContext([span(33, 30)]).goodNight).toBe(false);
  });
});

describe('adjustWakeRange', () => {
  it('keeps the range after a full nap or a night', () => {
    expect(adjustWakeRange(RANGE, { napMs: 90 * M, shortNapsToday: 0, goodNight: false })).toEqual({
      range: RANGE,
      reason: null,
    });
    expect(adjustWakeRange(RANGE, { napMs: null, shortNapsToday: 0, goodNight: true }).reason).toBeNull();
  });

  it('shortens the whole range after a short nap', () => {
    expect(adjustWakeRange(RANGE, { napMs: 20 * M, shortNapsToday: 1, goodNight: false })).toEqual({
      range: { low: 70 * M, mid: 84 * M, high: 98 * M },
      reason: 'short-nap',
    });
  });

  it('holds the range for the first short nap after a good night', () => {
    expect(adjustWakeRange(RANGE, { napMs: 20 * M, shortNapsToday: 1, goodNight: true })).toEqual({
      range: RANGE,
      reason: 'good-night',
    });
  });

  it('lets a good night soften the second short nap and not the third', () => {
    const second = adjustWakeRange(RANGE, { napMs: 20 * M, shortNapsToday: 2, goodNight: true });
    const third = adjustWakeRange(RANGE, { napMs: 20 * M, shortNapsToday: 3, goodNight: true });
    expect(second).toEqual({ range: { low: 85 * M, mid: 102 * M, high: 119 * M }, reason: 'short-nap' });
    expect(third.range).toEqual({ low: 70 * M, mid: 84 * M, high: 98 * M });
  });
});

describe('wakeWindowText', () => {
  const window: WakeWindow = {
    wokeAt: '2026-10-13T00:00:00Z',
    from: '2026-10-13T01:15:00Z',
    to: '2026-10-13T01:45:00Z',
    reason: null,
    napMs: null,
  };
  const at = (time: string) => new Date(`2026-10-13T${time}:00Z`);

  it('counts down to settling before the window opens', () => {
    expect(wakeWindowText(window, at('00:52'), TZ)).toEqual({
      text: 'Wake window 1h 15m–1h 45m · start settling in 23m · around 2:15 pm',
      overdue: false,
    });
    expect(wakeWindowText(window, new Date('2026-10-13T01:14:30Z'), TZ).text).toBe(
      'Wake window 1h 15m–1h 45m · start settling now',
    );
  });

  it('says when to be asleep by once the window is open', () => {
    expect(wakeWindowText(window, at('01:30'), TZ)).toEqual({
      text: 'Wake window 1h 15m–1h 45m · time to settle · asleep by 2:45 pm',
      overdue: false,
    });
  });

  it('says how far past the window it is', () => {
    expect(wakeWindowText(window, at('02:05'), TZ)).toEqual({
      text: 'Past the 1h 15m–1h 45m wake window by 20m · likely ready for sleep',
      overdue: true,
    });
  });

  it('explains a window shortened by a short nap', () => {
    const shortened = { ...window, reason: 'short-nap' as const, napMs: 28 * M };
    expect(wakeWindowText(shortened, at('00:52'), TZ).text).toBe(
      'Wake window 1h 15m–1h 45m · start settling in 23m · around 2:15 pm · shorter after a 28m nap',
    );
  });

  it('explains a window a good night kept at full length', () => {
    const held = { ...window, reason: 'good-night' as const, napMs: 28 * M };
    expect(wakeWindowText(held, at('01:30'), TZ).text).toBe(
      'Wake window 1h 15m–1h 45m · time to settle · asleep by 2:45 pm · a good night makes up for the 28m nap',
    );
  });
});
