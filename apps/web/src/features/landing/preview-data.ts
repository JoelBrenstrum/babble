import {
  sampleBaby,
  sampleEvents,
  sampleMonthEvents,
  sampleMonthView,
  sampleRunningFeed,
  sampleRunningSleep,
} from '@babble/api/fixtures';
import {
  babyAgeLabel,
  chairFeedSummary,
  chairFeedView,
  dayKeyFor,
  dayLayout,
  dayTotalCards,
  dayWindow,
  fractionOf,
  hourTicks,
  feedDueText,
  insightsReport,
  predictedLayout,
  predictionText,
  type PredictedBlock,
  formatTimeOfDay,
  lastFeedLine,
  lastNappyLine,
  nextBreastSide,
  previousFeedSides,
  nextFeedDue,
  summariseDay,
  todayInTimeZone,
  type BabyEvent,
  type EventOfType,
} from '@babble/domain';
import type { ChairData } from '#/features/chair/chair-screen';

const { timezone, day_start_minutes: dayStart } = sampleBaby;
const NIGHT = { nightStartMinutes: 19 * 60, nightEndMinutes: 7 * 60 };
const TIMELINE_ANCHOR_HOURS = 12.5;

const MINUTE = 60_000;
const at = (base: Date, minutes: number) => new Date(base.getTime() + minutes * MINUTE).toISOString();

export function homePreview(now: Date) {
  const running = sampleRunningFeed(now);
  const events = sampleEvents(now);
  const summary = summariseDay([running, ...events], { start: new Date(now.getTime() - 12 * 3_600_000), end: now });
  const predicted: PredictedBlock[] = [
    { kind: 'feed', startedAt: at(now, -26), endedAt: at(now, 6), continuesRunning: true },
    { kind: 'sleep', startedAt: at(now, 18), endedAt: at(now, 95), continuesRunning: false },
  ];
  return {
    running: [running],
    latest: [running, ...events],
    summary,
    prediction: predictionText(predicted, now, timezone),
  };
}

export function timelinePreview(now: Date) {
  const dayKey = dayKeyFor(now.toISOString(), timezone, dayStart);
  const window = dayWindow(dayKey, timezone, dayStart);
  const at = new Date(window.start.getTime() + TIMELINE_ANCHOR_HOURS * 3_600_000);
  const earlier: BabyEvent[] = sampleEvents(new Date(at.getTime() - 6 * 3_600_000)).map((event) => ({
    ...event,
    id: `${event.id}-earlier`,
  }));
  const events = [...earlier, ...sampleEvents(at)];
  const summary = summariseDay(events, window, {
    now: at,
    night: { dayKey, timeZone: timezone, ...NIGHT },
  });
  const ahead = (minutes: number) => new Date(at.getTime() + minutes * MINUTE).toISOString();
  const predicted: PredictedBlock[] = [
    {
      kind: 'sleep',
      startedAt:
        events.find((event) => event.type === 'sleep' && event.endedAt === null)?.startedAt ?? at.toISOString(),
      endedAt: ahead(35),
      continuesRunning: true,
    },
    { kind: 'feed', startedAt: ahead(40), endedAt: ahead(65), continuesRunning: false },
    { kind: 'sleep', startedAt: ahead(125), endedAt: ahead(200), continuesRunning: false },
    { kind: 'feed', startedAt: ahead(205), endedAt: ahead(230), continuesRunning: false },
  ];
  return {
    now: at,
    layout: dayLayout(events, window, at),
    ticks: hourTicks(dayKey, timezone, dayStart, 3),
    nowFrac: fractionOf(window, at.getTime()),
    totals: dayTotalCards(summary, 'metric', timezone),
    predicted: predictedLayout(predicted, window, at, timezone),
    prediction: predictionText(predicted, at, timezone),
  };
}

const minutesAgo = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

export function pausePreview(now: Date): { feed: EventOfType<'breast_feed'>; nap: EventOfType<'sleep'> } {
  const feed: EventOfType<'breast_feed'> = {
    ...(sampleRunningFeed(now) as EventOfType<'breast_feed'>),
    id: 'preview-paused-feed',
    sessionState: 'paused',
    startedAt: minutesAgo(now, 19),
    segments: [
      { side: 'left', startedAt: minutesAgo(now, 19), endedAt: minutesAgo(now, 10) },
      { side: 'right', startedAt: minutesAgo(now, 9.5), endedAt: minutesAgo(now, 1.2) },
    ],
  };
  const nap: EventOfType<'sleep'> = {
    ...(sampleRunningSleep(now) as EventOfType<'sleep'>),
    id: 'preview-paused-nap',
    sessionState: 'paused',
    startedAt: minutesAgo(now, 64),
    segments: [
      { startedAt: minutesAgo(now, 64), endedAt: minutesAgo(now, 38) },
      { startedAt: minutesAgo(now, 33), endedAt: minutesAgo(now, 4) },
    ],
  };
  return { feed, nap };
}

export function chairPreview(now: Date): { idle: ChairData; feeding: ChairData } {
  const events = sampleEvents(now);
  const due = nextFeedDue(events, { feed_reminder_enabled: true, feed_reminder_interval_min: 180 });
  const idle: ChairData = {
    babyName: sampleBaby.name,
    age: babyAgeLabel(sampleBaby.birth_date, todayInTimeZone(timezone, now)),
    babies: [],
    clock: formatTimeOfDay(now.toISOString(), timezone),
    night: false,
    dimmed: false,
    updateReady: false,
    fullscreen: { supported: false, active: false },
    offline: false,
    lastFeed: lastFeedLine(events, now, 'metric', timezone),
    due: due ? feedDueText(due, now, timezone) : null,
    suggested: nextBreastSide(events),
    previousSides: previousFeedSides(events),
    feed: null,
    nap: null,
    lastNappy: lastNappyLine(events, now),
    nappyAsk: { start: false, switch: false, end: false },
    units: 'metric',
    bottle: { amount: 120, content: 'breast_milk' },
  };
  const running = sampleRunningFeed(now) as EventOfType<'breast_feed'>;
  return {
    idle,
    feeding: {
      ...idle,
      night: true,
      feed: {
        id: running.id,
        view: chairFeedView(running, now, 15_000),
        summary: chairFeedSummary(running, now, 15_000),
        asleepSince: null,
        startedLine: `Started ${formatTimeOfDay(running.startedAt, timezone)} by Jane`,
        startedBy: 'Jane',
      },
    },
  };
}

export function monthPreview(now: Date) {
  const events = sampleMonthEvents(now);
  const { days, ticks, todayKey } = sampleMonthView(now);
  const insights = insightsReport(events, todayKey, now, {
    timeZone: timezone,
    dayStartMinutes: dayStart,
    ...NIGHT,
    mergeGapMs: 15_000,
  });
  return { days, ticks, todayKey, insights };
}
