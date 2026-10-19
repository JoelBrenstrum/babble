import { formatDuration } from '../format/duration';
import { formatTimeOfDay } from '../time/local-time';
import { isWithinNight } from '../time/night';
import { nightSettingsFrom, type NightSettingsRow } from './baby-settings';
import { latestFeed, nextBreastSide } from './feed-rules';
import { SIDE_LABEL } from './labels';
import type { BabyEvent, Side } from './types';
import { MINUTE_MS } from '../time/constants';

export const FEED_REMINDER_INTERVALS_MIN = [120, 150, 180, 210, 240] as const;
export const DEFAULT_FEED_REMINDER_INTERVAL_MIN = 180;

export interface FeedReminderSettings {
  feed_reminder_enabled: boolean;
  feed_reminder_interval_min: number | null;
}

export interface FeedDue {
  dueAt: string;
  nextSide: Side | null;
}

export function nextFeedDue(events: readonly BabyEvent[], settings: FeedReminderSettings): FeedDue | null {
  const interval = settings.feed_reminder_interval_min;
  if (!settings.feed_reminder_enabled || !interval) return null;
  if (events.some((event) => event.type === 'breast_feed' && event.endedAt === null && !event.deletedAt)) return null;
  const last = latestFeed(events);
  if (!last) return null;
  return {
    dueAt: new Date(Date.parse(last.startedAt) + interval * MINUTE_MS).toISOString(),
    nextSide: nextBreastSide(events),
  };
}

export function feedDueText(due: FeedDue, now: Date, timeZone: string): { text: string; overdue: boolean } {
  const ms = Date.parse(due.dueAt) - now.getTime();
  const at = formatTimeOfDay(due.dueAt, timeZone);
  const side = due.nextSide ? ` · ${SIDE_LABEL[due.nextSide]} side next` : '';
  if (Math.abs(ms) < MINUTE_MS) return { text: `Feed due now${side}`, overdue: false };
  if (ms > 0) {
    return { text: `Next feed due in ${formatDuration(ms, { seconds: false })} · around ${at}${side}`, overdue: false };
  }
  return { text: `Overdue ${formatDuration(-ms, { seconds: false })} · was due ${at}${side}`, overdue: true };
}

export function formatInterval(minutes: number): string {
  return formatDuration(minutes * MINUTE_MS, { seconds: false }).replace(/ 00m$/, '');
}

export function feedReminderOptions(settings: FeedReminderSettings): { value: string; label: string }[] {
  const current = settings.feed_reminder_interval_min;
  const minutes = [...FEED_REMINDER_INTERVALS_MIN] as number[];
  if (settings.feed_reminder_enabled && current && !minutes.includes(current)) minutes.push(current);
  return [
    { value: 'off', label: 'Off' },
    ...minutes.sort((a, b) => a - b).map((value) => ({ value: String(value), label: formatInterval(value) })),
  ];
}

export function feedReminderChoice(settings: FeedReminderSettings): string {
  return settings.feed_reminder_enabled && settings.feed_reminder_interval_min
    ? String(settings.feed_reminder_interval_min)
    : 'off';
}

export function feedReminderPatch(choice: string | null): Partial<FeedReminderSettings> {
  const minutes = Number(choice);
  if (!choice || choice === 'off' || !Number.isInteger(minutes)) return { feed_reminder_enabled: false };
  return { feed_reminder_enabled: true, feed_reminder_interval_min: minutes };
}

export interface NightReminderSettings extends NightSettingsRow {
  feed_reminder_at_night: boolean;
}

export function feedRemindersQuiet(settings: NightReminderSettings, at: Date, timeZone: string): boolean {
  if (settings.feed_reminder_at_night) return false;
  return isWithinNight(at, { timeZone, ...nightSettingsFrom(settings) });
}

export function feedDueFor(
  latest: readonly BabyEvent[],
  running: readonly BabyEvent[],
  settings: (FeedReminderSettings & NightReminderSettings) | null | undefined,
  now: Date,
  timeZone: string,
): FeedDue | null {
  if (!settings || feedRemindersQuiet(settings, now, timeZone)) return null;
  return nextFeedDue([...latest, ...running], settings);
}

export interface FeedDueMarker {
  frac: number;
  label: string;
  overdue: boolean;
}

export function feedDueMarker(
  due: FeedDue | null,
  window: { start: Date; end: Date },
  now: Date,
  timeZone: string,
): FeedDueMarker | null {
  if (!due) return null;
  const at = Date.parse(due.dueAt);
  const start = window.start.getTime();
  const end = window.end.getTime();
  if (at < start || at > end) return null;
  const { overdue } = feedDueText(due, now, timeZone);
  const time = formatTimeOfDay(due.dueAt, timeZone);
  return { frac: (at - start) / (end - start), label: overdue ? `Feed was due ${time}` : `Feed due ${time}`, overdue };
}
