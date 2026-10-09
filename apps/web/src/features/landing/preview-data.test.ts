import { describe, expect, it } from 'vitest';
import { homePreview, timelinePreview } from './preview-data';

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
