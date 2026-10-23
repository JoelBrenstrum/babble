import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import type { BabyEvent } from '../events/types';
import { homeAssistantSnapshot, type SnapshotInput, type SnapshotSettings } from './snapshot';

const SETTINGS: SnapshotSettings = {
  feed_reminder_enabled: true,
  feed_reminder_interval_min: 180,
  feed_reminder_at_night: false,
  night_start_minutes: 19 * 60,
  night_end_minutes: 7 * 60,
  downtime_merge_threshold_sec: 15,
  auto_end_paused_session_min: 30,
  units: 'metric',
};

const BABY: SnapshotInput['baby'] = {
  id: 'baby-1',
  name: 'Olive',
  birthDate: '2026-09-01',
  sex: 'female',
  timeZone: 'UTC',
  dayStartMinutes: 0,
};

function snapshot(events: BabyEvent[], overrides: Partial<SnapshotInput> = {}) {
  return homeAssistantSnapshot({
    now: new Date('2026-10-06T12:00:00Z'),
    baby: BABY,
    settings: SETTINGS,
    events,
    predictions: false,
    ...overrides,
  });
}

const bottle = makeEvent('bottle', {
  id: 'bottle',
  startedAt: '2026-10-06T10:00:00Z',
  endedAt: '2026-10-06T10:00:00Z',
  details: { content: 'formula', amountMl: 120, amountLeftMl: 20 },
});

const morningNap = makeEvent('sleep', {
  id: 'morning-nap',
  startedAt: '2026-10-06T08:00:00Z',
  endedAt: '2026-10-06T09:00:00Z',
});

describe('homeAssistantSnapshot sleep', () => {
  it('counts a running nap from its start', () => {
    const nap = makeEvent('sleep', { id: 'nap', startedAt: '2026-10-06T11:15:00Z', endedAt: null });
    const { sleep } = snapshot([morningNap, nap]);
    expect(sleep).toMatchObject({ state: 'active', started_at: '2026-10-06T11:15:00Z', asleep_s: 45 * 60 });
    expect(sleep.awake_since).toBeNull();
    expect(sleep.previous).toEqual({
      started_at: '2026-10-06T08:00:00Z',
      ended_at: '2026-10-06T09:00:00Z',
      asleep_s: 3600,
    });
  });

  it('leaves the pause out of a paused nap and reports when it paused', () => {
    const nap = makeEvent('sleep', {
      id: 'nap',
      startedAt: '2026-10-06T11:00:00Z',
      endedAt: null,
      sessionState: 'paused',
      segments: [{ startedAt: '2026-10-06T11:00:00Z', endedAt: '2026-10-06T11:50:00Z' }],
    });
    const { sleep } = snapshot([nap]);
    expect(sleep).toMatchObject({
      state: 'paused',
      asleep_s: 50 * 60,
      awake_s: 10 * 60,
      awake_since: '2026-10-06T11:50:00.000Z',
    });
  });

  it('treats a nap paused longer than the auto-end limit as ended', () => {
    const nap = makeEvent('sleep', {
      id: 'nap',
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: null,
      sessionState: 'paused',
      segments: [{ startedAt: '2026-10-06T10:00:00Z', endedAt: '2026-10-06T11:00:00Z' }],
    });
    const { sleep } = snapshot([nap]);
    expect(sleep.state).toBe('none');
    expect(sleep.awake_since).toBe('2026-10-06T11:00:00.000Z');
    expect(sleep.previous?.asleep_s).toBe(3600);
  });

  it('is awake since the last sleep ended when nothing is running', () => {
    expect(snapshot([morningNap]).sleep).toMatchObject({ state: 'none', awake_since: '2026-10-06T09:00:00Z' });
  });
});

describe('homeAssistantSnapshot feeds', () => {
  it('is due one interval after the latest feed started', () => {
    expect(snapshot([bottle]).feed).toEqual({
      last: { type: 'bottle', started_at: '2026-10-06T10:00:00Z', ended_at: '2026-10-06T10:00:00Z' },
      next_due: '2026-10-06T13:00:00.000Z',
      interval_min: 180,
      quiet: false,
      suppressed: null,
    });
  });

  it('still gives the due time at night but marks reminders as quiet', () => {
    const feed = snapshot([bottle], { now: new Date('2026-10-06T22:00:00Z') }).feed;
    expect(feed.next_due).toBe('2026-10-06T13:00:00.000Z');
    expect(feed.quiet).toBe(true);
  });

  it('explains why there is no due time', () => {
    const off = { ...SETTINGS, feed_reminder_enabled: false };
    const running = makeEvent('breast_feed', {
      id: 'running',
      startedAt: '2026-10-06T11:50:00Z',
      endedAt: null,
      segments: [{ side: 'left', startedAt: '2026-10-06T11:50:00Z', endedAt: null }],
    });
    expect(snapshot([bottle], { settings: off }).feed).toMatchObject({ next_due: null, suppressed: 'reminders_off' });
    expect(snapshot([bottle, running]).feed).toMatchObject({ next_due: null, suppressed: 'feeding' });
    expect(snapshot([]).feed).toMatchObject({ next_due: null, suppressed: 'no_feeds' });
  });

  it('times each side of a running breastfeed and remembers the previous one', () => {
    const previous = makeEvent('breast_feed', {
      id: 'previous',
      startedAt: '2026-10-06T08:00:00Z',
      endedAt: '2026-10-06T08:25:00Z',
      segments: [
        { side: 'left', startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T08:10:00Z' },
        { side: 'right', startedAt: '2026-10-06T08:10:00Z', endedAt: '2026-10-06T08:25:00Z' },
      ],
    });
    const running = makeEvent('breast_feed', {
      id: 'running',
      startedAt: '2026-10-06T11:40:00Z',
      endedAt: null,
      segments: [
        { side: 'left', startedAt: '2026-10-06T11:40:00Z', endedAt: '2026-10-06T11:52:00Z' },
        { side: 'right', startedAt: '2026-10-06T11:52:00Z', endedAt: null },
      ],
    });
    expect(snapshot([previous, running]).nursing).toEqual({
      state: 'active',
      started_at: '2026-10-06T11:40:00Z',
      left_s: 12 * 60,
      right_s: 8 * 60,
      active_side: 'right',
      last_side: 'right',
      next_side: 'right',
      previous: {
        started_at: '2026-10-06T08:00:00Z',
        ended_at: '2026-10-06T08:25:00Z',
        left_s: 10 * 60,
        right_s: 15 * 60,
        last_side: 'right',
      },
    });
  });

  it('reports how much of the last bottle was drunk', () => {
    expect(snapshot([bottle]).bottle).toEqual({
      started_at: '2026-10-06T10:00:00Z',
      content: 'formula',
      amount_ml: 120,
      drunk_ml: 100,
    });
  });
});

describe('homeAssistantSnapshot', () => {
  it("totals today's events from the start of the baby's day", () => {
    const wet = makeEvent('nappy', { id: 'wet', startedAt: '2026-10-06T09:30:00Z', endedAt: '2026-10-06T09:30:00Z' });
    const yesterday = makeEvent('nappy', {
      id: 'yesterday',
      startedAt: '2026-10-05T09:30:00Z',
      endedAt: '2026-10-05T09:30:00Z',
    });
    const { today } = snapshot([wet, yesterday, bottle, morningNap]);
    expect(today).toMatchObject({
      day_started_at: '2026-10-06T00:00:00.000Z',
      nappies: 1,
      wet_nappies: 1,
      feeds: 1,
      bottle_ml: 100,
      naps: 1,
      sleep_s: 3600,
    });
  });

  it('gives growth in kg and cm with WHO percentiles when the sex is known', () => {
    const growth = makeEvent('growth', {
      id: 'growth',
      startedAt: '2026-10-01T09:00:00Z',
      endedAt: '2026-10-01T09:00:00Z',
      details: { weightG: 4200, lengthMm: 540, headCircumferenceMm: null },
    });
    const known = snapshot([growth]).growth;
    expect(known).toMatchObject({ weight_kg: 4.2, length_cm: 54, head_cm: null, head_percentile: null });
    expect(known?.weight_percentile).toBeGreaterThan(0);
    expect(known?.weight_percentile).toBeLessThan(100);
    expect(snapshot([growth], { baby: { ...BABY, sex: null } }).growth?.weight_percentile).toBeNull();
  });

  it('uses the newest copy of an event and skips deleted ones', () => {
    const edited = { ...bottle, updatedAt: '2026-10-06T11:00:00Z', details: { ...bottle.details, amountMl: 150 } };
    const deleted = makeEvent('nappy', { id: 'gone', deletedAt: '2026-10-06T11:00:00Z' });
    const result = snapshot([bottle, edited, deleted]);
    expect(result.bottle?.amount_ml).toBe(150);
    expect(result.nappy).toBeNull();
  });

  it('leaves predictions out unless the family has them', () => {
    expect(snapshot([bottle]).predictions).toBeNull();
    expect(snapshot([bottle], { predictions: true }).predictions).toEqual(
      expect.objectContaining({ next_sleep_at: expect.toBeOneOf([null, expect.any(String)]) }),
    );
  });

  it('describes the baby', () => {
    expect(snapshot([]).baby).toEqual({
      id: 'baby-1',
      name: 'Olive',
      birth_date: '2026-09-01',
      sex: 'female',
      age: '5w',
      timezone: 'UTC',
      units: 'metric',
    });
  });
});
