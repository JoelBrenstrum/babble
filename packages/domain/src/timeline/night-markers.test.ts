import { describe, expect, it } from 'vitest';
import { dayWindow } from '../time/local-time';
import { nightMarkers } from './night-markers';

const tz = 'Pacific/Auckland';
const settings = { night_start_minutes: 19 * 60, night_end_minutes: 7 * 60 };

describe('nightMarkers', () => {
  it('marks when the night starts within a midnight-to-midnight day', () => {
    const markers = nightMarkers(dayWindow('2026-10-06', tz, 0), settings, tz);
    expect(markers.map((marker) => marker.label)).toEqual(['Night starts 7:00 pm']);
    expect(markers[0]!.frac).toBeCloseTo(19 / 24);
  });

  it('follows a day that starts in the morning', () => {
    const markers = nightMarkers(dayWindow('2026-10-06', tz, 6 * 60), settings, tz);
    expect(markers.map((marker) => marker.frac)).toEqual([13 / 24]);
  });

  it('covers a rolling 24 hours', () => {
    const window = { start: new Date('2026-10-06T00:30:00Z'), end: new Date('2026-10-07T00:30:00Z') };
    expect(nightMarkers(window, settings, tz)).toHaveLength(1);
  });

  it('marks nothing without settings or with no night', () => {
    expect(nightMarkers(dayWindow('2026-10-06', tz, 0), null, tz)).toEqual([]);
    expect(nightMarkers(dayWindow('2026-10-06', tz, 0), { night_start_minutes: 0, night_end_minutes: 0 }, tz)).toEqual(
      [],
    );
  });
});
