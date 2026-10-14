import { describe, expect, it } from 'vitest';
import {
  feedDueFor,
  feedDueMarker,
  feedDueText,
  feedReminderChoice,
  feedReminderOptions,
  feedReminderPatch,
  feedRemindersQuiet,
  formatInterval,
  nextFeedDue,
} from './feed-due';
import { makeEvent } from './test-events';

const ON = { feed_reminder_enabled: true, feed_reminder_interval_min: 180 };
const breast = makeEvent('breast_feed', {
  id: 'breast',
  startedAt: '2026-10-06T08:00:00Z',
  endedAt: '2026-10-06T08:30:00Z',
  segments: [{ side: 'right', startedAt: '2026-10-06T08:00:00Z', endedAt: '2026-10-06T08:30:00Z' }],
});
const bottle = makeEvent('bottle', {
  id: 'bottle',
  startedAt: '2026-10-06T09:00:00Z',
  endedAt: '2026-10-06T09:00:00Z',
});

describe('nextFeedDue', () => {
  it('measures from the start of the latest breast or bottle feed', () => {
    expect(nextFeedDue([breast], ON)).toEqual({ dueAt: '2026-10-06T11:00:00.000Z', nextSide: 'left' });
    expect(nextFeedDue([breast, bottle], ON)).toEqual({ dueAt: '2026-10-06T12:00:00.000Z', nextSide: 'left' });
  });

  it('ignores deleted feeds and other trackers', () => {
    const nap = makeEvent('sleep', { startedAt: '2026-10-06T09:30:00Z', endedAt: '2026-10-06T10:00:00Z' });
    expect(nextFeedDue([breast, { ...bottle, deletedAt: '2026-10-06T09:05:00Z' }, nap], ON)?.dueAt).toBe(
      '2026-10-06T11:00:00.000Z',
    );
  });

  it('is off when reminders are off, nothing is logged, or a breastfeed is running', () => {
    expect(nextFeedDue([breast], { ...ON, feed_reminder_enabled: false })).toBeNull();
    expect(nextFeedDue([breast], { ...ON, feed_reminder_interval_min: null })).toBeNull();
    expect(nextFeedDue([], ON)).toBeNull();
    expect(nextFeedDue([breast, { ...breast, id: 'running', endedAt: null }], ON)).toBeNull();
  });

  it('follows interval changes', () => {
    expect(nextFeedDue([bottle], { ...ON, feed_reminder_interval_min: 150 })).toEqual({
      dueAt: '2026-10-06T11:30:00.000Z',
      nextSide: null,
    });
  });
});

describe('feedDueText', () => {
  const due = { dueAt: '2026-10-06T11:00:00.000Z', nextSide: 'left' as const };
  it.each([
    ['2026-10-06T10:18:00Z', 'Next feed due in 42m · around 11:00 am · Left side next', false],
    ['2026-10-06T08:00:00Z', 'Next feed due in 3h 00m · around 11:00 am · Left side next', false],
    ['2026-10-06T11:00:30Z', 'Feed due now · Left side next', false],
    ['2026-10-06T11:10:00Z', 'Overdue 10m · was due 11:00 am · Left side next', true],
  ])('at %s says %s', (now, text, overdue) => {
    expect(feedDueText(due, new Date(now), 'UTC')).toEqual({ text, overdue });
  });

  it('leaves out the side when only bottles are logged', () => {
    expect(feedDueText({ ...due, nextSide: null }, new Date('2026-10-06T10:18:00Z'), 'UTC').text).toBe(
      'Next feed due in 42m · around 11:00 am',
    );
  });

  it("gives the due time in the baby's time zone", () => {
    expect(feedDueText(due, new Date('2026-10-06T10:18:00Z'), 'Pacific/Auckland').text).toBe(
      'Next feed due in 42m · around 12:00 am · Left side next',
    );
  });
});

describe('formatInterval', () => {
  it('names each interval choice', () => {
    expect([120, 150, 180, 210, 240].map(formatInterval)).toEqual(['2h', '2h 30m', '3h', '3h 30m', '4h']);
  });
});

describe('feed reminder choices', () => {
  it('offers Off and the usual intervals, keeping an unusual saved one', () => {
    expect(feedReminderOptions(ON).map((option) => option.label)).toEqual([
      'Off',
      '2h',
      '2h 30m',
      '3h',
      '3h 30m',
      '4h',
    ]);
    expect(feedReminderOptions({ ...ON, feed_reminder_interval_min: 100 }).map((option) => option.value)).toContain(
      '100',
    );
  });

  it('maps settings to a choice and back', () => {
    expect(feedReminderChoice(ON)).toBe('180');
    expect(feedReminderChoice({ ...ON, feed_reminder_enabled: false })).toBe('off');
    expect(feedReminderPatch('150')).toEqual({ feed_reminder_enabled: true, feed_reminder_interval_min: 150 });
    expect(feedReminderPatch('off')).toEqual({ feed_reminder_enabled: false });
    expect(feedReminderPatch(null)).toEqual({ feed_reminder_enabled: false });
  });
});

describe('feedRemindersQuiet', () => {
  const night = { feed_reminder_at_night: false, night_start_minutes: 19 * 60, night_end_minutes: 7 * 60 };
  const tz = 'Pacific/Auckland';
  it.each([
    ['2026-10-06T05:59:00Z', false],
    ['2026-10-06T06:00:00Z', true],
    ['2026-10-06T13:00:00Z', true],
    ['2026-10-06T17:59:00Z', true],
    ['2026-10-06T18:00:00Z', false],
  ])('in Auckland (UTC+13) at %s is quiet: %s', (at, quiet) => {
    expect(feedRemindersQuiet(night, new Date(at), tz)).toBe(quiet);
  });

  it('is never quiet when night reminders are on', () => {
    expect(feedRemindersQuiet({ ...night, feed_reminder_at_night: true }, new Date('2026-10-06T13:00:00Z'), tz)).toBe(
      false,
    );
  });
});

describe('feedDueFor', () => {
  const settings = { ...ON, feed_reminder_at_night: false, night_start_minutes: 19 * 60, night_end_minutes: 7 * 60 };
  const day = new Date('2026-10-06T12:00:00Z');
  const night = new Date('2026-10-06T10:00:00Z');

  it('combines the latest and running events', () => {
    expect(feedDueFor([breast], [bottle], settings, day, 'UTC')).toEqual(nextFeedDue([breast, bottle], settings));
  });

  it('is quiet at night when reminders are off then, and awake in the day', () => {
    expect(feedDueFor([breast], [], settings, night, 'Pacific/Auckland')).toBeNull();
    expect(
      feedDueFor([breast], [], { ...settings, feed_reminder_at_night: true }, night, 'Pacific/Auckland'),
    ).not.toBeNull();
    expect(feedDueFor([breast], [], settings, day, 'UTC')).not.toBeNull();
  });

  it('is null until settings load', () => {
    expect(feedDueFor([breast], [], undefined, day, 'UTC')).toBeNull();
    expect(feedDueFor([breast], [], null, day, 'UTC')).toBeNull();
  });

  it('is null while a breastfeed is running', () => {
    expect(feedDueFor([breast], [{ ...breast, id: 'live', endedAt: null }], settings, day, 'UTC')).toBeNull();
  });
});

describe('feedDueMarker', () => {
  const window = { start: new Date('2026-10-06T00:00:00Z'), end: new Date('2026-10-07T00:00:00Z') };
  const due = { dueAt: '2026-10-06T12:00:00.000Z', nextSide: null };

  it('places the due time on the day', () => {
    expect(feedDueMarker(due, window, new Date('2026-10-06T10:00:00Z'), 'UTC')).toEqual({
      frac: 0.5,
      label: 'Feed due 12:00 pm',
      overdue: false,
    });
  });

  it('says when the feed is overdue', () => {
    expect(feedDueMarker(due, window, new Date('2026-10-06T13:00:00Z'), 'UTC')).toEqual({
      frac: 0.5,
      label: 'Feed was due 12:00 pm',
      overdue: true,
    });
  });

  it('shows nothing without a due feed or outside the day', () => {
    expect(feedDueMarker(null, window, new Date('2026-10-06T10:00:00Z'), 'UTC')).toBeNull();
    const tomorrow = { dueAt: '2026-10-07T01:00:00.000Z', nextSide: null };
    expect(feedDueMarker(tomorrow, window, new Date('2026-10-06T23:00:00Z'), 'UTC')).toBeNull();
  });
});
