import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import { buildChairData, type ChairDataInput } from './chair-data';

const now = new Date('2026-10-06T12:00:00Z');
const baby = { id: 'b1', name: 'Olivia', birth_date: '2026-08-06', timezone: 'UTC' };
const settings = {
  feed_reminder_enabled: true,
  feed_reminder_interval_min: 180,
  feed_reminder_at_night: true,
  night_start_minutes: 19 * 60,
  night_end_minutes: 7 * 60,
};

const runningFeed = makeEvent('breast_feed', {
  id: 'feed',
  createdBy: 'u1',
  startedAt: '2026-10-06T11:40:00Z',
  endedAt: null,
  segments: [{ side: 'left', startedAt: '2026-10-06T11:40:00Z', endedAt: null }],
});
const lastFeed = makeEvent('breast_feed', {
  id: 'last',
  startedAt: '2026-10-06T08:00:00Z',
  endedAt: '2026-10-06T08:20:00Z',
  segments: [{ side: 'right', startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T08:20:00Z' }],
});

const input = (patch: Partial<ChairDataInput> = {}): ChairDataInput => ({
  baby,
  choices: [{ baby, familyId: 'f1', familyName: 'Smiths' }],
  members: [{ user_id: 'u1', display_name: 'Sam' }],
  running: [],
  latest: [lastFeed],
  settings,
  units: 'metric',
  mergeGapMs: 30_000,
  nappyPrompt: 'feed_start',
  now,
  lastTouchAt: now.getTime(),
  ...patch,
});

describe('buildChairData', () => {
  it('describes an idle chair', () => {
    const { data, feed, nap } = buildChairData(input());
    expect(feed).toBeNull();
    expect(nap).toBeNull();
    expect(data).toMatchObject({
      babyName: 'Olivia',
      age: '8w 5d',
      clock: '12:00 pm',
      night: false,
      dimmed: false,
      feed: null,
      nap: null,
      suggested: 'left',
      previousSides: { left: '0m', right: '20m' },
      lastNappy: null,
      units: 'metric',
      bottle: { amount: 120, content: 'breast_milk' },
    });
    expect(data.lastFeed).toBe('Last fed 8:00 am · 4h 00m ago · Right side · 20m');
    expect(data.due).toEqual({ text: 'Overdue 1h 00m · was due 11:00 am · Left side next', overdue: true });
  });

  it('describes a running feed, who started it, and the nappy prompts', () => {
    const { data, feed } = buildChairData(input({ running: [runningFeed], nappyPrompt: 'feed_end' }));
    expect(feed?.id).toBe('feed');
    expect(data.feed).toMatchObject({
      id: 'feed',
      startedBy: 'Sam',
      startedLine: 'Started 11:40 am by Sam',
      view: { paused: false, side: 'left', title: 'Feeding · Left' },
    });
    expect(data.due).toBeNull();
    expect(data.nappyAsk).toEqual({ start: false, switch: false, end: true });
  });

  it('asks about a nappy on the first change of side', () => {
    const { data } = buildChairData(input({ running: [runningFeed], nappyPrompt: 'first_side' }));
    expect(data.nappyAsk).toEqual({ start: false, switch: true, end: true });
  });

  it('shows a running nap as its length so far', () => {
    const sleep = makeEvent('sleep', { id: 'nap', startedAt: '2026-10-06T11:15:00Z', endedAt: null, segments: [] });
    const { data, nap } = buildChairData(input({ running: [sleep] }));
    expect(nap?.id).toBe('nap');
    expect(data.nap).toEqual({ asleep: '45m', paused: false });
  });

  it('shows a paused nap with the time asleep before the pause', () => {
    const sleep = makeEvent('sleep', {
      id: 'nap',
      startedAt: '2026-10-06T11:15:00Z',
      endedAt: null,
      segments: [{ startedAt: '2026-10-06T11:15:00Z', endedAt: '2026-10-06T11:40:00Z' }],
    });
    expect(buildChairData(input({ running: [sleep] })).data.nap).toEqual({ asleep: '25m', paused: true });
  });

  it('labels each baby, adding the family only when there are several', () => {
    const other = { id: 'b2', name: 'Noah', birth_date: '2025-10-06', timezone: 'UTC' };
    const one = buildChairData(
      input({
        choices: [
          { baby, familyId: 'f1', familyName: 'Smiths' },
          { baby: other, familyId: 'f1', familyName: 'Smiths' },
        ],
      }),
    );
    expect(one.data.babies).toEqual([
      { id: 'b1', name: 'Olivia', detail: '8w 5d', selected: true },
      { id: 'b2', name: 'Noah', detail: '12 months', selected: false },
    ]);
    const many = buildChairData(
      input({
        choices: [
          { baby, familyId: 'f1', familyName: 'Smiths' },
          { baby: other, familyId: 'f2', familyName: 'Joneses' },
        ],
      }),
    );
    expect(many.data.babies.map((entry) => entry.detail)).toEqual(['8w 5d · Smiths', '12 months · Joneses']);
  });

  it('dims after idling and treats the night window as night', () => {
    expect(buildChairData(input({ lastTouchAt: now.getTime() - 6 * 60_000 })).data.dimmed).toBe(true);
    const night = buildChairData(
      input({ now: new Date('2026-10-06T22:00:00Z'), lastTouchAt: Date.parse('2026-10-06T21:59:00Z') }),
    );
    expect(night.data).toMatchObject({ night: true, dimmed: true });
  });

  it('copes without settings', () => {
    const { data } = buildChairData(input({ settings: undefined }));
    expect(data).toMatchObject({ due: null, night: false, dimmed: false });
  });
});
