import { buildSegments } from './segment-form';

describe('buildSegments', () => {
  it('lays the sides out back to back from the start', () => {
    expect(buildSegments('2026-10-06T10:00:00.000Z', { left: 10, right: 5 })).toEqual([
      { side: 'left', startedAt: '2026-10-06T10:00:00.000Z', endedAt: '2026-10-06T10:10:00.000Z' },
      { side: 'right', startedAt: '2026-10-06T10:10:00.000Z', endedAt: '2026-10-06T10:15:00.000Z' },
    ]);
  });

  it('skips sides with no minutes', () => {
    expect(buildSegments('2026-10-06T10:00:00.000Z', { left: null, right: 7 })).toEqual([
      { side: 'right', startedAt: '2026-10-06T10:00:00.000Z', endedAt: '2026-10-06T10:07:00.000Z' },
    ]);
    expect(buildSegments('2026-10-06T10:00:00.000Z', { left: 0, right: null })).toEqual([]);
  });
});
