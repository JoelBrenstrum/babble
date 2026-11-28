import { describe, expect, it } from 'vitest';
import { dayWindow } from '../time/local-time';
import { nightMarkers, timelineNightMarkers } from './night-markers';
import { timelineModel, type TimelineView } from './timeline-model';

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

describe('timelineNightMarkers', () => {
  const now = new Date('2026-10-13T02:00:00Z');
  const model = (view: TimelineView, dayStart = 0) =>
    timelineModel({
      view,
      date: null,
      events: [],
      settings: null,
      baby: { timezone: tz, day_start_minutes: dayStart, birth_date: '2026-01-01' },
      now,
    });

  it('marks the night start on the day and rolling views', () => {
    expect(timelineNightMarkers(model('day'), settings, tz).map((marker) => marker.frac)).toEqual([19 / 24]);
    expect(timelineNightMarkers(model('24h'), settings, tz)).toHaveLength(1);
  });

  it('gives the week and month one marker that every day shares', () => {
    for (const view of ['7d', '30d'] as const) {
      const markers = timelineNightMarkers(model(view), settings, tz);
      expect(markers.map((marker) => marker.label)).toEqual(['Night starts 7:00 pm']);
      expect(markers[0]!.frac).toBeCloseTo(19 / 24);
    }
  });

  it('draws the night start once when the day starts with it', () => {
    expect(timelineNightMarkers(model('7d', 19 * 60), settings, tz).map((marker) => marker.frac)).toEqual([0]);
  });

  it('marks nothing without a model', () => {
    expect(timelineNightMarkers(null, settings, tz)).toEqual([]);
  });
});
