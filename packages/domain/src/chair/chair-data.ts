import { babyAgeLabel } from '../format/baby-age';
import { formatDurationShort } from '../format/duration';
import { todayInTimeZone } from '../format/time-of-day';
import { feedDueFor, feedDueText, type FeedReminderSettings, type NightReminderSettings } from '../events/feed-due';
import { nextBreastSide } from '../events/feed-rules';
import {
  nappyPromptOnFeedFinish,
  nappyPromptOnFeedStart,
  nappyPromptOnSideChange,
  type NappyPromptTiming,
} from '../events/session-prompts';
import { otherSide } from '../events/segments';
import { summariseSleep } from '../events/sleep-stretches';
import type { BabyEvent, BottleContent, EventOfType, Side, Units } from '../events/types';
import { formatTimeOfDay } from '../time/local-time';
import type { NightWindow } from '../theme/theme-preference';
import {
  chairAsleepSince,
  chairDimmed,
  chairFeedSummary,
  chairFeedView,
  chairIsNight,
  defaultBottleAmount,
  defaultBottleContent,
  lastFeedLine,
  lastNappyLine,
  runningBreastFeed,
  type ChairFeedView,
} from './chair';

export interface ChairBabyInput {
  baby: { id: string; name: string; birth_date: string; timezone: string };
  familyId: string;
  familyName: string;
}

export interface ChairDataInput {
  baby: ChairBabyInput['baby'];
  choices: readonly ChairBabyInput[];
  members: readonly { user_id: string; display_name: string | null }[];
  running: readonly BabyEvent[];
  latest: readonly BabyEvent[];
  settings: (FeedReminderSettings & NightReminderSettings) | null | undefined;
  units: Units;
  mergeGapMs: number;
  nappyPrompt: NappyPromptTiming;
  now: Date;
  lastTouchAt: number;
}

export interface ChairBaby {
  id: string;
  name: string;
  detail: string;
  selected: boolean;
}

export interface ChairFeed {
  id: string;
  view: ChairFeedView;
  summary: { title: string; sides: string };
  asleepSince: { at: string; label: string } | null;
  startedLine: string;
  startedBy: string | null;
}

export interface ChairNap {
  asleep: string;
  paused: boolean;
}

export interface ChairViewModel {
  babyName: string;
  age: string;
  babies: ChairBaby[];
  clock: string;
  night: boolean;
  dimmed: boolean;
  lastFeed: string;
  due: { text: string; overdue: boolean } | null;
  suggested: Side | null;
  feed: ChairFeed | null;
  nap: ChairNap | null;
  lastNappy: string | null;
  nappyAsk: { start: boolean; switch: boolean; end: boolean };
  units: Units;
  bottle: { amount: number; content: BottleContent };
}

export function buildChairData(input: ChairDataInput): {
  data: ChairViewModel;
  feed: EventOfType<'breast_feed'> | null;
  nap: EventOfType<'sleep'> | null;
} {
  const { baby, choices, members, running, latest, settings, units, mergeGapMs, nappyPrompt, now, lastTouchAt } = input;
  const at = now.toISOString();
  const night: NightWindow | null = settings
    ? { timeZone: baby.timezone, start: settings.night_start_minutes, end: settings.night_end_minutes }
    : null;
  const feed = runningBreastFeed(running);
  const nap = running.find((event): event is EventOfType<'sleep'> => event.type === 'sleep') ?? null;
  const due = feedDueFor(latest, running, settings, now, baby.timezone);
  const startedBy = feed ? (members.find((member) => member.user_id === feed.createdBy)?.display_name ?? null) : null;
  const feedView = feed ? chairFeedView(feed, now, mergeGapMs) : null;
  const multipleFamilies = new Set(choices.map((choice) => choice.familyId)).size > 1;

  const data: ChairViewModel = {
    babyName: baby.name,
    age: babyAgeLabel(baby.birth_date, todayInTimeZone(baby.timezone, now)),
    babies: choices.map((choice) => ({
      id: choice.baby.id,
      name: choice.baby.name,
      detail: `${babyAgeLabel(choice.baby.birth_date, todayInTimeZone(choice.baby.timezone, now))}${
        multipleFamilies ? ` · ${choice.familyName}` : ''
      }`,
      selected: choice.baby.id === baby.id,
    })),
    clock: formatTimeOfDay(at, baby.timezone),
    night: chairIsNight(night, now),
    dimmed: chairDimmed(night, now, lastTouchAt),
    lastFeed: lastFeedLine(latest, now, units, baby.timezone),
    due: due ? feedDueText(due, now, baby.timezone) : null,
    suggested: nextBreastSide(latest),
    feed:
      feed && feedView
        ? {
            id: feed.id,
            view: feedView,
            summary: chairFeedSummary(feed, now, mergeGapMs),
            asleepSince: chairAsleepSince(feed, now, baby.timezone),
            startedLine: `Started ${formatTimeOfDay(feed.startedAt, baby.timezone)}${startedBy ? ` by ${startedBy}` : ''}`,
            startedBy,
          }
        : null,
    nap: nap ? chairNap(nap, now) : null,
    lastNappy: lastNappyLine(latest, now),
    nappyAsk: {
      start: nappyPromptOnFeedStart(nappyPrompt, latest, at) !== null,
      switch:
        feed !== null &&
        feedView !== null &&
        nappyPromptOnSideChange(nappyPrompt, feed, otherSide(feedView.side), latest, at) !== null,
      end: feed !== null && nappyPromptOnFeedFinish(nappyPrompt, feed, latest, at) !== null,
    },
    units,
    bottle: { amount: defaultBottleAmount(latest, units), content: defaultBottleContent(latest) },
  };
  return { data, feed, nap };
}

export function chairNap(nap: EventOfType<'sleep'>, now: Date): ChairNap {
  const summary = summariseSleep(nap, now);
  return { asleep: formatDurationShort(summary.asleepMs), paused: summary.paused };
}
