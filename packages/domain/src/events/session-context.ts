import { formatAgo, formatDuration } from '../format/duration';
import { formatVolume } from '../format/units';
import { formatTimeOfDay } from '../time/local-time';
import { nextBreastSide } from './feed-rules';
import { segmentTotals } from './segments';
import { summariseSleep } from './sleep-stretches';
import type { BabyEvent, EventDraft, EventOfType, Side, TimedSegment, Units } from './types';

const SIDE_LABEL: Record<Side, string> = { left: 'Left', right: 'Right' };

function latestOfType<T extends 'breast_feed' | 'pump' | 'sleep'>(
  events: readonly BabyEvent[],
  type: T,
): EventOfType<T> | undefined {
  const matching = events
    .filter((event) => event.type === type && !event.deletedAt)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  return matching[0] as EventOfType<T> | undefined;
}

function lastSide(segments: readonly TimedSegment[]): Side | null {
  return [...segments].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt)).at(-1)?.side ?? null;
}

function pumpTotalMl(details: EventOfType<'pump'>['details']): number | null {
  if (details.totalMl !== null) return details.totalMl;
  if (details.leftMl === null && details.rightMl === null) return null;
  return (details.leftMl ?? 0) + (details.rightMl ?? 0);
}

export function startContext(
  type: 'breast_feed' | 'pump' | 'sleep',
  latest: readonly BabyEvent[],
  now: Date,
  units: Units,
): string | null {
  if (type === 'breast_feed') {
    const feed = latestOfType(latest, 'breast_feed');
    if (!feed) return 'No breastfeeds logged yet. Start on either side.';
    if (!feed.endedAt) return null;
    const ago = formatAgo(now.getTime() - Date.parse(feed.endedAt));
    const side = lastSide(feed.segments);
    const next = nextBreastSide(latest);
    const ended = side ? `Last feed ended on ${SIDE_LABEL[side]}, ${ago}.` : `Last feed ended ${ago}.`;
    return next ? `${ended} Next side: ${SIDE_LABEL[next]}.` : ended;
  }
  if (type === 'pump') {
    const pump = latestOfType(latest, 'pump');
    if (!pump?.endedAt) return null;
    const ml = pumpTotalMl(pump.details);
    const ago = formatAgo(now.getTime() - Date.parse(pump.endedAt));
    return ml === null ? `Last pump ${ago}.` : `Last pump ${ago} · ${formatVolume(ml, units)}.`;
  }
  const nap = latestOfType(latest, 'sleep');
  if (!nap?.endedAt) return null;
  return `Awake ${formatDuration(now.getTime() - Date.parse(nap.endedAt), { seconds: false })} since the last nap.`;
}

export function runningSessionLine(event: BabyEvent, now: Date, startedBy?: string): string {
  const by = startedBy ? ` · started by ${startedBy}` : '';
  if (event.type === 'sleep') {
    const sleep = summariseSleep(event, now);
    return `${sleep.paused ? 'Nap paused' : 'Napping'} · ${formatDuration(sleep.asleepMs, { seconds: false })}${by}`;
  }
  if (event.type !== 'breast_feed' && event.type !== 'pump') return startedBy ? `Started by ${startedBy}` : '';
  const totals = segmentTotals(event.segments, now);
  if (totals.openSide && totals.openSegmentStartedAt) {
    const currentMs = now.getTime() - Date.parse(totals.openSegmentStartedAt);
    return `${SIDE_LABEL[totals.openSide]} · ${formatDuration(currentMs)}${by}`;
  }
  return `Paused · ${formatDuration(totals.activeMs)}${by}`;
}

export type RunningTone = 'downtime' | 'sleep' | 'pump' | 'feed-left' | 'feed-right';

export function runningTone(event: BabyEvent): RunningTone {
  if (event.type !== 'sleep' && event.type !== 'breast_feed' && event.type !== 'pump') return 'downtime';
  const segments: readonly { endedAt: string | null }[] = event.segments;
  if (segments.length > 0 && segments.every((segment) => segment.endedAt !== null)) return 'downtime';
  if (event.type === 'sleep') return 'sleep';
  if (event.type === 'pump') return 'pump';
  return event.segments.find((segment) => segment.endedAt === null)?.side === 'left' ? 'feed-left' : 'feed-right';
}

export function pausedForMs(segments: readonly TimedSegment[], now: Date): number | null {
  if (segments.length === 0 || segments.some((segment) => segment.endedAt === null)) return null;
  const lastEnd = Math.max(...segments.map((segment) => Date.parse(segment.endedAt!)));
  return Math.max(0, now.getTime() - lastEnd);
}

export function pumpFinishSummary(event: BabyEvent, timeZone: string): string | null {
  if (event.type !== 'pump' || !event.endedAt) return null;
  const activeMs =
    event.segments.length > 0
      ? segmentTotals(event.segments, new Date(event.endedAt)).activeMs
      : Date.parse(event.endedAt) - Date.parse(event.startedAt);
  return `${formatDuration(activeMs)} · finished ${formatTimeOfDay(event.endedAt, timeZone)}`;
}

export function manualSleepDuration(startedAt: string, endedAt: string | null): string | null {
  if (!endedAt) return null;
  const ms = Date.parse(endedAt) - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return formatDuration(ms, { seconds: false });
}

export function withoutPumpAmounts(draft: EventDraft): EventDraft {
  if (draft.type !== 'pump') return draft;
  return { ...draft, details: { leftMl: null, rightMl: null, totalMl: null } };
}
