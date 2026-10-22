import { nightSettingsFrom } from '../events/baby-settings';
import { summariseDay, summaryOptions, type SummarySettings } from '../events/day-summary';
import {
  feedRemindersQuiet,
  nextFeedDue,
  type FeedReminderSettings,
  type NightReminderSettings,
} from '../events/feed-due';
import { latestFeed, nextBreastSide, staleSessions } from '../events/feed-rules';
import { lastSegmentEnd, segmentTotals } from '../events/segments';
import { summariseSleep } from '../events/sleep-stretches';
import type { BabyEvent, BottleContent, EventOfType, EventType, Side, Units } from '../events/types';
import { babyAgeLabel } from '../format/baby-age';
import { todayInTimeZone } from '../format/time-of-day';
import { ageInMonths, lmsAt, normalCdf, zScore, type BabySex, type GrowthMeasure } from '../growth/growth';
import { predictAhead } from '../predict/predicted-view';
import { byStartedAtDesc } from '../time/instants';
import { homeWindow } from '../timeline/home-window';

export type SnapshotSettings = FeedReminderSettings &
  NightReminderSettings &
  SummarySettings & { auto_end_paused_session_min: number; units: Units };

export interface SnapshotInput {
  now: Date;
  baby: {
    id: string;
    name: string;
    birthDate: string;
    sex: BabySex | null;
    timeZone: string;
    dayStartMinutes: number;
  };
  settings: SnapshotSettings;
  events: readonly BabyEvent[];
  predictions: boolean;
}

export type TimerState = 'active' | 'paused' | 'none';

export type FeedDueSuppressed = 'reminders_off' | 'feeding' | 'no_feeds';

export interface HomeAssistantSnapshot {
  as_of: string;
  baby: {
    id: string;
    name: string;
    birth_date: string;
    sex: BabySex | null;
    age: string;
    timezone: string;
    units: Units;
  };
  sleep: {
    state: TimerState;
    started_at: string | null;
    asleep_s: number;
    awake_s: number;
    wake_ups: number;
    awake_since: string | null;
    previous: { started_at: string; ended_at: string; asleep_s: number } | null;
  };
  nursing: {
    state: TimerState;
    started_at: string | null;
    left_s: number;
    right_s: number;
    active_side: Side | null;
    last_side: Side | null;
    next_side: Side | null;
    previous: { started_at: string; ended_at: string; left_s: number; right_s: number; last_side: Side | null } | null;
  };
  pumping: {
    state: TimerState;
    started_at: string | null;
    previous: {
      started_at: string;
      ended_at: string;
      duration_s: number;
      left_ml: number | null;
      right_ml: number | null;
      total_ml: number | null;
    } | null;
  };
  feed: {
    last: { type: 'breast_feed' | 'bottle'; started_at: string; ended_at: string | null } | null;
    next_due: string | null;
    interval_min: number | null;
    quiet: boolean;
    suppressed: FeedDueSuppressed | null;
  };
  bottle: { started_at: string; content: BottleContent; amount_ml: number | null; drunk_ml: number | null } | null;
  solids: { started_at: string; foods: string[]; amount: string | null; reaction: string | null } | null;
  nappy: {
    started_at: string;
    wet: boolean;
    dirty: boolean;
    wet_size: string | null;
    poo_size: string | null;
    colours: string[];
    textures: string[];
    rash: boolean;
  } | null;
  growth: {
    started_at: string;
    weight_kg: number | null;
    length_cm: number | null;
    head_cm: number | null;
    weight_percentile: number | null;
    length_percentile: number | null;
    head_percentile: number | null;
  } | null;
  today: {
    day_started_at: string;
    sleep_s: number;
    night_sleep_s: number;
    nap_sleep_s: number;
    naps: number;
    longest_sleep_s: number;
    feeds: number;
    breast_feed_s: number;
    bottles: number;
    bottle_ml: number;
    nappies: number;
    wet_nappies: number;
    dirty_nappies: number;
    solids: number;
    pumps: number;
    pump_ml: number;
  };
  predictions: { next_sleep_at: string | null; next_feed_at: string | null; likely_awake_at: string | null } | null;
}

const seconds = (ms: number) => Math.max(0, Math.floor(ms / 1000));

function dedupe(events: readonly BabyEvent[]): BabyEvent[] {
  const byId = new Map<string, BabyEvent>();
  for (const event of events) {
    const seen = byId.get(event.id);
    if (!seen || seen.updatedAt < event.updatedAt) byId.set(event.id, event);
  }
  return [...byId.values()].filter((event) => !event.deletedAt).sort(byStartedAtDesc);
}

// Paused sessions are only auto-ended by an open app, so treat stale ones as already ended at their last segment.
function settleStale(events: readonly BabyEvent[], now: Date, autoEndMinutes: number): BabyEvent[] {
  const running = events.filter((event) => event.endedAt === null);
  const stale = new Set(staleSessions(running, now, autoEndMinutes).map((event) => event.id));
  return events.map((event) => {
    if (!stale.has(event.id) || !('segments' in event)) return event;
    const end = lastSegmentEnd(event);
    return end === null ? event : { ...event, endedAt: new Date(end).toISOString(), sessionState: 'ended' };
  });
}

function ofType<T extends EventType>(events: readonly BabyEvent[], type: T): EventOfType<T>[] {
  return events.filter((event): event is EventOfType<T> => event.type === type);
}

const ended = <T extends BabyEvent>(events: readonly T[]) =>
  events.find((event): event is T & { endedAt: string } => event.endedAt !== null) ?? null;

function sleepSection(events: readonly BabyEvent[], now: Date): HomeAssistantSnapshot['sleep'] {
  const sleeps = ofType(events, 'sleep');
  const current = sleeps.find((event) => event.endedAt === null);
  const last = ended(sleeps);
  const previous = last && {
    started_at: last.startedAt,
    ended_at: last.endedAt,
    asleep_s: seconds(summariseSleep(last, now).asleepMs),
  };
  if (!current) {
    return {
      state: 'none',
      started_at: null,
      asleep_s: 0,
      awake_s: 0,
      wake_ups: 0,
      awake_since: last?.endedAt ?? null,
      previous,
    };
  }
  const summary = summariseSleep(current, now);
  const pausedAt = summary.paused ? lastSegmentEnd(current) : null;
  return {
    state: summary.paused ? 'paused' : 'active',
    started_at: current.startedAt,
    asleep_s: seconds(summary.asleepMs),
    awake_s: seconds(summary.awakeMs),
    wake_ups: summary.wakeUps,
    awake_since: pausedAt === null ? null : new Date(pausedAt).toISOString(),
    previous,
  };
}

function nursingSection(events: readonly BabyEvent[], now: Date): HomeAssistantSnapshot['nursing'] {
  const feeds = ofType(events, 'breast_feed');
  const current = feeds.find((event) => event.endedAt === null);
  const last = ended(feeds);
  const lastTotals = last && segmentTotals(last.segments, new Date(last.endedAt));
  const previous = last &&
    lastTotals && {
      started_at: last.startedAt,
      ended_at: last.endedAt,
      left_s: seconds(lastTotals.leftMs),
      right_s: seconds(lastTotals.rightMs),
      last_side: lastTotals.lastSide,
    };
  const next_side = nextBreastSide(events);
  if (!current) {
    return {
      state: 'none',
      started_at: null,
      left_s: 0,
      right_s: 0,
      active_side: null,
      last_side: null,
      next_side,
      previous,
    };
  }
  const totals = segmentTotals(current.segments, now);
  return {
    state: totals.open ? 'active' : 'paused',
    started_at: current.startedAt,
    left_s: seconds(totals.leftMs),
    right_s: seconds(totals.rightMs),
    active_side: totals.openSide,
    last_side: totals.lastSide,
    next_side,
    previous,
  };
}

function pumpingSection(events: readonly BabyEvent[], now: Date): HomeAssistantSnapshot['pumping'] {
  const pumps = ofType(events, 'pump');
  const current = pumps.find((event) => event.endedAt === null);
  const last = ended(pumps);
  const previous = last && {
    started_at: last.startedAt,
    ended_at: last.endedAt,
    duration_s:
      last.segments.length > 0
        ? seconds(segmentTotals(last.segments, new Date(last.endedAt)).activeMs)
        : seconds(Date.parse(last.endedAt) - Date.parse(last.startedAt)),
    left_ml: last.details.leftMl,
    right_ml: last.details.rightMl,
    total_ml:
      last.details.totalMl ??
      (last.details.leftMl === null && last.details.rightMl === null
        ? null
        : (last.details.leftMl ?? 0) + (last.details.rightMl ?? 0)),
  };
  if (!current) return { state: 'none', started_at: null, previous };
  return {
    state: segmentTotals(current.segments, now).open ? 'active' : 'paused',
    started_at: current.startedAt,
    previous,
  };
}

function feedSection(input: SnapshotInput, events: readonly BabyEvent[]): HomeAssistantSnapshot['feed'] {
  const { settings, now, baby } = input;
  const last = latestFeed(events);
  const due = nextFeedDue(events, settings);
  const remindersOn = settings.feed_reminder_enabled && Boolean(settings.feed_reminder_interval_min);
  const feeding = events.some((event) => event.type === 'breast_feed' && event.endedAt === null);
  const suppressed: FeedDueSuppressed | null = !remindersOn
    ? 'reminders_off'
    : feeding
      ? 'feeding'
      : !last
        ? 'no_feeds'
        : null;
  return {
    last: last
      ? { type: last.type === 'bottle' ? 'bottle' : 'breast_feed', started_at: last.startedAt, ended_at: last.endedAt }
      : null,
    next_due: due?.dueAt ?? null,
    interval_min: remindersOn ? settings.feed_reminder_interval_min : null,
    quiet: feedRemindersQuiet(settings, now, baby.timeZone),
    suppressed,
  };
}

function bottleSection(events: readonly BabyEvent[]): HomeAssistantSnapshot['bottle'] {
  const last = ofType(events, 'bottle')[0];
  if (!last) return null;
  const { amountMl, amountLeftMl, content } = last.details;
  return {
    started_at: last.startedAt,
    content,
    amount_ml: amountMl,
    drunk_ml: amountMl === null ? null : Math.max(0, amountMl - (amountLeftMl ?? 0)),
  };
}

function solidsSection(events: readonly BabyEvent[]): HomeAssistantSnapshot['solids'] {
  const last = ofType(events, 'solids')[0];
  return last
    ? {
        started_at: last.startedAt,
        foods: last.details.foods,
        amount: last.details.amount,
        reaction: last.details.reaction,
      }
    : null;
}

function nappySection(events: readonly BabyEvent[]): HomeAssistantSnapshot['nappy'] {
  const last = ofType(events, 'nappy')[0];
  if (!last) return null;
  const { wet, dirty, wetSize, pooSize, pooColours, pooTextures, rash } = last.details;
  return {
    started_at: last.startedAt,
    wet,
    dirty,
    wet_size: wetSize,
    poo_size: pooSize,
    colours: pooColours,
    textures: pooTextures,
    rash,
  };
}

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places;

function percentile(measure: GrowthMeasure, value: number | null, sex: BabySex | null, months: number): number | null {
  if (value === null || sex === null) return null;
  const lms = lmsAt(measure, sex, months);
  return lms ? round(normalCdf(zScore(value, lms)) * 100, 1) : null;
}

function growthSection(events: readonly BabyEvent[], baby: SnapshotInput['baby']): HomeAssistantSnapshot['growth'] {
  const last = ofType(events, 'growth')[0];
  if (!last) return null;
  const { weightG, lengthMm, headCircumferenceMm } = last.details;
  const weight = weightG === null ? null : weightG / 1000;
  const length = lengthMm === null ? null : lengthMm / 10;
  const head = headCircumferenceMm === null ? null : headCircumferenceMm / 10;
  const months = ageInMonths(baby.birthDate, last.startedAt, baby.timeZone);
  return {
    started_at: last.startedAt,
    weight_kg: weight,
    length_cm: length,
    head_cm: head,
    weight_percentile: percentile('weight', weight, baby.sex, months),
    length_percentile: percentile('length', length, baby.sex, months),
    head_percentile: percentile('head', head, baby.sex, months),
  };
}

function todaySection(input: SnapshotInput, events: readonly BabyEvent[]): HomeAssistantSnapshot['today'] {
  const { now, baby, settings } = input;
  const { dayKey, window } = homeWindow(now, { timezone: baby.timeZone, day_start_minutes: baby.dayStartMinutes });
  const day = summariseDay(events, window, summaryOptions(settings, { timezone: baby.timeZone }, dayKey, now));
  return {
    day_started_at: window.start.toISOString(),
    sleep_s: seconds(day.sleepMs),
    night_sleep_s: seconds(day.nightMs),
    nap_sleep_s: seconds(day.napMs),
    naps: day.naps,
    longest_sleep_s: seconds(day.longestSleepMs),
    feeds: day.feeds,
    breast_feed_s: seconds(day.leftMs + day.rightMs),
    bottles: day.bottles,
    bottle_ml: day.bottleMl,
    nappies: day.nappies,
    wet_nappies: day.wet,
    dirty_nappies: day.dirty,
    solids: day.solids,
    pumps: day.pumps,
    pump_ml: day.pumpMl,
  };
}

function predictionsSection(input: SnapshotInput, events: readonly BabyEvent[]): HomeAssistantSnapshot['predictions'] {
  if (!input.predictions) return null;
  const blocks =
    predictAhead(events, input.now, {
      timeZone: input.baby.timeZone,
      birthDate: input.baby.birthDate,
      night: nightSettingsFrom(input.settings),
    }) ?? [];
  return {
    next_sleep_at: blocks.find((block) => block.kind === 'sleep' && !block.continuesRunning)?.startedAt ?? null,
    next_feed_at: blocks.find((block) => block.kind === 'feed' && !block.continuesRunning)?.startedAt ?? null,
    likely_awake_at: blocks.find((block) => block.kind === 'sleep' && block.continuesRunning)?.endedAt ?? null,
  };
}

export function homeAssistantSnapshot(input: SnapshotInput): HomeAssistantSnapshot {
  const { now, baby, settings } = input;
  const events = settleStale(dedupe(input.events), now, settings.auto_end_paused_session_min);
  return {
    as_of: now.toISOString(),
    baby: {
      id: baby.id,
      name: baby.name,
      birth_date: baby.birthDate,
      sex: baby.sex,
      age: babyAgeLabel(baby.birthDate, todayInTimeZone(baby.timeZone, now)),
      timezone: baby.timeZone,
      units: settings.units,
    },
    sleep: sleepSection(events, now),
    nursing: nursingSection(events, now),
    pumping: pumpingSection(events, now),
    feed: feedSection(input, events),
    bottle: bottleSection(events),
    solids: solidsSection(events),
    nappy: nappySection(events),
    growth: growthSection(events, baby),
    today: todaySection(input, events),
    predictions: predictionsSection(input, events),
  };
}
