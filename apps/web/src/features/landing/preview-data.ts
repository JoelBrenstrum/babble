import { sampleBaby, sampleEvents, sampleRunningFeed } from '@babble/api/fixtures';
import {
  dayKeyFor,
  dayLayout,
  dayTotalCards,
  dayWindow,
  fractionOf,
  hourTicks,
  summariseDay,
  type BabyEvent,
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
