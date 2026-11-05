import { describe, expect, it } from 'vitest';
import {
  addWakeUpRow,
  editRowsToNap,
  editRowTotals,
  joinHoursMinutes,
  napToEditRows,
  removeWakeUpRow,
  splitHoursMinutes,
} from './nap-edit-rows';

const START = '2026-10-06T09:00:00.000Z';
const at = (minutes: number) => new Date(Date.parse(START) + minutes * 60_000).toISOString();
const min = (minutes: number) => minutes * 60_000;

describe('napToEditRows', () => {
  it('is a single asleep row for a nap without wake-ups', () => {
    expect(napToEditRows(START, at(90), [])).toEqual([{ kind: 'asleep', durationMs: min(90) }]);
  });

  it('alternates asleep and awake rows from the stretches', () => {
    const stretches = [
      { startedAt: START, endedAt: at(40) },
      { startedAt: at(50), endedAt: at(90) },
      { startedAt: at(95), endedAt: at(120) },
    ];
    expect(napToEditRows(START, at(120), stretches)).toEqual([
      { kind: 'asleep', durationMs: min(40) },
      { kind: 'awake', durationMs: min(10) },
      { kind: 'asleep', durationMs: min(40) },
      { kind: 'awake', durationMs: min(5) },
      { kind: 'asleep', durationMs: min(25) },
    ]);
  });

  it('never has a negative duration when the end is before the start', () => {
    expect(napToEditRows(START, at(-10), [])).toEqual([{ kind: 'asleep', durationMs: 0 }]);
  });
});

describe('editRowsToNap', () => {
  it('lays the rows out in order from the start', () => {
    expect(
      editRowsToNap(START, [
        { kind: 'asleep', durationMs: min(40) },
        { kind: 'awake', durationMs: min(10) },
        { kind: 'asleep', durationMs: min(30) },
      ]),
    ).toEqual({
      segments: [
        { startedAt: START, endedAt: at(40) },
        { startedAt: at(50), endedAt: at(80) },
      ],
      endedAt: at(80),
    });
  });

  it('has no stretches when there is no wake-up', () => {
    expect(editRowsToNap(START, [{ kind: 'asleep', durationMs: min(60) }])).toEqual({ segments: [], endedAt: at(60) });
  });

  it('joins asleep rows separated by an empty wake-up', () => {
    expect(
      editRowsToNap(START, [
        { kind: 'asleep', durationMs: min(20) },
        { kind: 'awake', durationMs: 0 },
        { kind: 'asleep', durationMs: min(20) },
      ]),
    ).toEqual({ segments: [], endedAt: at(40) });
  });

  it('ignores wake-ups before falling asleep or after the last sleep', () => {
    expect(
      editRowsToNap(START, [
        { kind: 'awake', durationMs: min(5) },
        { kind: 'asleep', durationMs: min(30) },
        { kind: 'awake', durationMs: min(5) },
      ]),
    ).toEqual({ segments: [], endedAt: at(30) });
  });

  it('round-trips with napToEditRows', () => {
    const stretches = [
      { startedAt: START, endedAt: at(40) },
      { startedAt: at(50), endedAt: at(90) },
    ];
    expect(editRowsToNap(START, napToEditRows(START, at(90), stretches))).toEqual({
      segments: stretches,
      endedAt: at(90),
    });
  });
});

describe('addWakeUpRow', () => {
  it('splits the longest sleep around a ten-minute wake-up, keeping the total', () => {
    const rows = addWakeUpRow([
      { kind: 'asleep', durationMs: min(20) },
      { kind: 'awake', durationMs: min(5) },
      { kind: 'asleep', durationMs: min(90) },
    ]);
    expect(rows).toEqual([
      { kind: 'asleep', durationMs: min(20) },
      { kind: 'awake', durationMs: min(5) },
      { kind: 'asleep', durationMs: min(40) },
      { kind: 'awake', durationMs: min(10) },
      { kind: 'asleep', durationMs: min(40) },
    ]);
  });

  it('keeps a short sleep mostly asleep', () => {
    expect(addWakeUpRow([{ kind: 'asleep', durationMs: min(9) }])).toEqual([
      { kind: 'asleep', durationMs: min(3) },
      { kind: 'awake', durationMs: min(3) },
      { kind: 'asleep', durationMs: min(3) },
    ]);
  });

  it('does nothing when there is no sleep to split', () => {
    expect(addWakeUpRow([{ kind: 'asleep', durationMs: 0 }])).toEqual([{ kind: 'asleep', durationMs: 0 }]);
  });

  it('keeps the end of a nap that does not fall on whole minutes', () => {
    const startedAt = '2026-10-06T09:00:17.250Z';
    const endedAt = '2026-10-06T10:31:44.901Z';
    const plain = napToEditRows(startedAt, endedAt, []);
    expect(editRowsToNap(startedAt, addWakeUpRow(plain)).endedAt).toBe(endedAt);
    const stretches = [
      { startedAt, endedAt: '2026-10-06T09:20:03.007Z' },
      { startedAt: '2026-10-06T09:26:41.333Z', endedAt },
    ];
    const split = addWakeUpRow(napToEditRows(startedAt, endedAt, stretches));
    expect(split.filter((row) => row.kind === 'awake')).toHaveLength(2);
    expect(editRowsToNap(startedAt, split).endedAt).toBe(endedAt);
  });
});

describe('removeWakeUpRow', () => {
  it('turns the wake-up back into sleep so the nap still ends at the same time', () => {
    expect(
      removeWakeUpRow(
        [
          { kind: 'asleep', durationMs: min(40) },
          { kind: 'awake', durationMs: min(10) },
          { kind: 'asleep', durationMs: min(30) },
          { kind: 'awake', durationMs: min(5) },
          { kind: 'asleep', durationMs: min(15) },
        ],
        1,
      ),
    ).toEqual([
      { kind: 'asleep', durationMs: min(80) },
      { kind: 'awake', durationMs: min(5) },
      { kind: 'asleep', durationMs: min(15) },
    ]);
  });

  it('leaves asleep rows alone', () => {
    const rows = [{ kind: 'asleep' as const, durationMs: min(40) }];
    expect(removeWakeUpRow(rows, 0)).toEqual(rows);
  });
});

describe('editRowTotals', () => {
  it('adds up asleep and awake time', () => {
    expect(
      editRowTotals([
        { kind: 'asleep', durationMs: min(40) },
        { kind: 'awake', durationMs: min(10) },
        { kind: 'asleep', durationMs: min(30) },
      ]),
    ).toEqual({ asleepMs: min(70), awakeMs: min(10) });
  });
});

describe('hours and minutes', () => {
  it('splits and joins a duration to the nearest minute', () => {
    expect(splitHoursMinutes(min(135) + 40_000)).toEqual({ hours: 2, minutes: 16 });
    expect(joinHoursMinutes(2, 16)).toBe(min(136));
  });
});
