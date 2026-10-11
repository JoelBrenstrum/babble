import { describe, expect, it } from 'vitest';
import { summariseSleep } from '@babble/domain';
import { chairPreview, homePreview, pausePreview, timelinePreview } from './preview-data';

const now = new Date('2026-10-09T02:00:00Z');

describe('homePreview', () => {
  it('shows a running breastfeed on top of the sample day', () => {
    const preview = homePreview(now);
    expect(preview.running).toHaveLength(1);
    expect(preview.running[0]).toMatchObject({ type: 'breast_feed', endedAt: null });
    expect(preview.latest[0]).toBe(preview.running[0]);
    expect(preview.summary.feeds).toBeGreaterThan(0);
  });
});

describe('timelinePreview', () => {
  it('fills the afternoon of the current day whatever the time now', () => {
    for (const at of ['2026-10-09T02:00:00Z', '2026-10-09T19:30:00Z', '2026-10-09T11:00:00Z']) {
      const preview = timelinePreview(new Date(at));
      expect(preview.nowFrac).toBeGreaterThan(0.45);
      expect(preview.nowFrac).toBeLessThan(0.6);
      expect(preview.layout.sleep.length).toBeGreaterThanOrEqual(2);
      expect(preview.layout.feeds.length).toBeGreaterThanOrEqual(2);
      expect(preview.layout.nappies.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('has totals for the day', () => {
    expect(timelinePreview(now).totals.map((card) => card.key)).toContain('sleep');
  });
});

describe('pausePreview', () => {
  it('shows a feed paused on its second side and a nap paused on its second wake-up', () => {
    const { feed, nap } = pausePreview(now);
    expect(feed).toMatchObject({ type: 'breast_feed', sessionState: 'paused', endedAt: null });
    expect(feed.segments.every((segment) => segment.endedAt !== null)).toBe(true);
    expect(nap).toMatchObject({ type: 'sleep', sessionState: 'paused', endedAt: null });
    expect(summariseSleep(nap, now)).toMatchObject({ paused: true, wakeUps: 2, asleepMs: 55 * 60_000 });
  });
});

describe('chairPreview', () => {
  it('shows an idle station with the last feed and nappy, and a feed running at night', () => {
    const { idle, feeding } = chairPreview(now);
    expect(idle.lastFeed).toMatch(/^Last fed /);
    expect(idle.lastNappy).not.toBeNull();
    expect(idle.feed).toBeNull();
    expect(feeding.night).toBe(true);
    expect(feeding.feed?.view.title).toBe('Feeding · Right');
  });
});
