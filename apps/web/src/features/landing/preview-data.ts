import { sampleBaby, sampleEvents, sampleRunningFeed, sampleRunningSleep } from '@babble/api/fixtures';
import {
  dayKeyFor,
  dayLayout,
  dayTotalCards,
  dayWindow,
  fractionOf,
  hourTicks,
  summariseDay,
  type BabyEvent,
  type EventOfType,
} from '@babble/domain';

const { timezone, day_start_minutes: dayStart } = sampleBaby;
const NIGHT = { startMinutes: 19 * 60, endMinutes: 7 * 60 };
const TIMELINE_ANCHOR_HOURS = 12.5;

export function homePreview(now: Date) {
  const running = sampleRunningFeed(now);
  const events = sampleEvents(now);
  const summary = summariseDay([running, ...events], { start: new Date(now.getTime() - 12 * 3_600_000), end: now });
  return { running: [running], latest: [running, ...events], summary };
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
  return {
    layout: dayLayout(events, window, at),
    ticks: hourTicks(dayKey, timezone, dayStart, 3),
    nowFrac: fractionOf(window, at.getTime()),
    totals: dayTotalCards(summary, 'metric', timezone),
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
