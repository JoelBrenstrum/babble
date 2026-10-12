import { describe, expect, it } from 'vitest';
import { editableRowsToSegments, segmentsToEditableRows, summariseSegments } from './session-summary';
import type { TimedSegment } from './types';

const at = (minutes: number, seconds = 0) => new Date(Date.UTC(2026, 9, 6, 10, minutes, seconds)).toISOString();
const seg = (side: 'left' | 'right', from: [number, number?], to: [number, number?] | null): TimedSegment => ({
  side,
  startedAt: at(...from),
  endedAt: to ? at(...to) : null,
});
const NOW = new Date(at(40));
const opts = { mergeGapMs: 15_000, now: NOW };
const min = (m: number, s = 0) => (m * 60 + s) * 1000;

describe('summariseSegments', () => {
  it('shows downtime between sides, matching the plan example', () => {
    const summary = summariseSegments(
      [seg('left', [0], [10, 32]), seg('right', [13, 34], [25, 57]), seg('left', [30, 0], [30, 30])],
      opts,
    );
    expect(summary.rows).toEqual([
      { kind: 'side', side: 'left', durationMs: min(10, 32), running: false },
      { kind: 'downtime', durationMs: min(3, 2), running: false },
      { kind: 'side', side: 'right', durationMs: min(12, 23), running: false },
      { kind: 'downtime', durationMs: min(4, 3), running: false, latest: true },
      { kind: 'side', side: 'left', durationMs: min(0, 30), running: false },
    ]);
    expect(summary.downtimeMs).toBe(min(7, 5));
    expect(summary.activeMs).toBe(min(23, 25));
    expect(summary.spanMs).toBe(min(30, 30));
  });

  it('drops gaps under the threshold when switching sides', () => {
    const summary = summariseSegments([seg('left', [0], [10]), seg('right', [10, 5], [20])], opts);
    expect(summary.rows.map((row) => row.kind)).toEqual(['side', 'side']);
    expect(summary.downtimeMs).toBe(0);
  });

  it('merges same-side segments with a tiny gap into one row', () => {
    const summary = summariseSegments([seg('left', [0], [10]), seg('left', [10, 4], [15])], opts);
    expect(summary.rows).toEqual([{ kind: 'side', side: 'left', durationMs: min(15) - 4000, running: false }]);
  });

  it('starts a new row after a pause over the threshold, even on the same side', () => {
    const summary = summariseSegments(
      [seg('right', [0], [10]), seg('left', [10], [15]), seg('left', [20], [24])],
      opts,
    );
    expect(summary.rows).toEqual([
      { kind: 'side', side: 'right', durationMs: min(10), running: false },
      { kind: 'side', side: 'left', durationMs: min(5), running: false },
      { kind: 'downtime', durationMs: min(5), running: false, latest: true },
      { kind: 'side', side: 'left', durationMs: min(4), running: false },
    ]);
    expect(summary.downtimeMs).toBe(min(5));
  });

  it('ignores a side shorter than the threshold, like a mistaken tap', () => {
    const summary = summariseSegments(
      [seg('left', [0], [5]), seg('right', [5], [5, 3]), seg('left', [5, 3], [11, 3])],
      opts,
    );
    expect(summary.rows).toEqual([{ kind: 'side', side: 'left', durationMs: min(11), running: false }]);
    expect(summary).toMatchObject({ leftMs: min(11), rightMs: 0, activeMs: min(11), downtimeMs: 0 });
  });

  it('always shows the side running now, however short', () => {
    const summary = summariseSegments([seg('left', [0], [10]), seg('right', [39, 55], null)], opts);
    expect(summary.rows.at(-1)).toEqual({ kind: 'side', side: 'right', durationMs: 5000, running: true });
  });

  it('keeps very short sides when they are all there is', () => {
    const summary = summariseSegments([seg('left', [0], [0, 5])], opts);
    expect(summary.rows).toEqual([{ kind: 'side', side: 'left', durationMs: 5000, running: false }]);
  });

  it('shows a live pause after the last side', () => {
    const summary = summariseSegments([seg('left', [0], [5]), seg('left', [6], [10])], {
      ...opts,
      pausedSince: at(10),
    });
    expect(summary.rows).toEqual([
      { kind: 'side', side: 'left', durationMs: min(5), running: false },
      { kind: 'downtime', durationMs: min(1), running: false, latest: true },
      { kind: 'side', side: 'left', durationMs: min(4), running: false },
      { kind: 'downtime', durationMs: min(30), running: true },
    ]);
  });

  it('counts the open segment up to now', () => {
    const summary = summariseSegments([seg('left', [0], [10]), seg('right', [12], null)], opts);
    expect(summary.rows.at(-1)).toEqual({ kind: 'side', side: 'right', durationMs: min(28), running: true });
  });

  it('shows live downtime while paused', () => {
    const summary = summariseSegments([seg('left', [0], [10])], { ...opts, pausedSince: at(10) });
    expect(summary.rows.at(-1)).toEqual({ kind: 'downtime', durationMs: min(30), running: true });
    expect(summary.spanMs).toBe(min(40));
  });

  it('respects a different threshold', () => {
    const summary = summariseSegments([seg('left', [0], [10]), seg('right', [10, 30], [20])], {
      ...opts,
      mergeGapMs: 60_000,
    });
    expect(summary.downtimeMs).toBe(0);
  });

  it('handles no segments', () => {
    expect(summariseSegments([], opts)).toEqual({
      rows: [],
      activeMs: 0,
      downtimeMs: 0,
      leftMs: 0,
      rightMs: 0,
      spanMs: 0,
    });
  });
});

describe('editable rows', () => {
  const segments = [seg('left', [0], [10]), seg('right', [12], [20])];

  it('round-trips segments through editable rows', () => {
    const rows = segmentsToEditableRows(segments, NOW);
    expect(rows).toEqual([
      { kind: 'side', side: 'left', durationMs: min(10) },
      { kind: 'downtime', durationMs: min(2) },
      { kind: 'side', side: 'right', durationMs: min(8) },
    ]);
    expect(editableRowsToSegments(at(0), rows)).toEqual({ segments, endedAt: at(20) });
  });

  it('recomputes timestamps in order after an edit', () => {
    const rows = segmentsToEditableRows(segments, NOW);
    rows[1] = { kind: 'downtime', durationMs: min(5) };
    expect(editableRowsToSegments(at(0), rows)).toEqual({
      segments: [seg('left', [0], [10]), seg('right', [15], [23])],
      endedAt: at(23),
    });
  });

  it('drops empty sides but keeps their downtime', () => {
    expect(
      editableRowsToSegments(at(0), [
        { kind: 'side', side: 'left', durationMs: 0 },
        { kind: 'downtime', durationMs: min(1) },
        { kind: 'side', side: 'right', durationMs: min(4) },
      ]),
    ).toEqual({ segments: [seg('right', [1], [5])], endedAt: at(5) });
  });
});
