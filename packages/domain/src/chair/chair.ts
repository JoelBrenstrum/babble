import { emptyDraft } from '../events/drafts';
import { withNappyType, type NappyType } from '../events/nappy';
import { pausedForMs } from '../events/session-context';
import { lastSegmentEnd, segmentTotals } from '../events/segments';
import { summariseSegments } from '../events/session-summary';
import type { BabyEvent, BottleContent, EventDraft, EventOfType, Side, Units } from '../events/types';
import { SIDE_LABEL } from '../events/labels';
import { formatAgo, formatDuration, formatTimer } from '../format/duration';
import { formatVolume, ML_PER_OUNCE, volumeToMl } from '../format/units';
import { formatTimeOfDay, isWithinNight } from '../time/local-time';
import { nappyKind } from '../timeline/totals';
import type { NightWindow } from '../theme/theme-preference';
import { byStartedAtDesc } from '../time/instants';
import { MINUTE_MS } from '../time/constants';

export const CHAIR_WAKE_MS = 30_000;
export const CHAIR_UNDO_MS = 5_000;
export const CHAIR_ENDED_MS = 10_000;
export const CHAIR_IDLE_DIM_MS = 5 * MINUTE_MS;
// The device's idle timer and ours start from the same tap, but ticks and clock syncs can drift a few seconds.
const SCREEN_OFF_SLACK_MS = 5_000;

type BreastFeed = EventOfType<'breast_feed'>;

export function runningBreastFeed(running: readonly BabyEvent[]): BreastFeed | null {
  return (
    running.find((event): event is BreastFeed => event.type === 'breast_feed' && !event.endedAt && !event.deletedAt) ??
    null
  );
}

export function lastFeedLine(events: readonly BabyEvent[], now: Date, units: Units, timeZone: string): string {
  const last = events
    .filter((event) => !event.deletedAt && (event.type === 'bottle' || (event.type === 'breast_feed' && event.endedAt)))
    .sort(byStartedAtDesc)[0];
  if (!last) return 'No feeds logged yet';
  const ago = `Last fed ${formatTimeOfDay(last.startedAt, timeZone)} · ${formatAgo(now.getTime() - Date.parse(last.startedAt))}`;
  if (last.type === 'bottle') {
    const amount = last.details.amountMl === null ? null : formatVolume(last.details.amountMl, units);
    return amount ? `${ago} · Bottle · ${amount}` : `${ago} · Bottle`;
  }
  if (last.type !== 'breast_feed') return ago;
  const totals = segmentTotals(last.segments, now);
  const side = totals.lastSide ? ` · ${SIDE_LABEL[totals.lastSide]} side` : '';
  const length = totals.activeMs >= MINUTE_MS ? ` · ${formatDuration(totals.activeMs, { seconds: false })}` : '';
  return `${ago}${side}${length}`;
}

export function lastNappyLine(events: readonly BabyEvent[], now: Date): string | null {
  const last = events
    .filter((event): event is EventOfType<'nappy'> => event.type === 'nappy' && !event.deletedAt)
    .filter((event) => !event.details.typePending)
    .sort(byStartedAtDesc)[0];
  if (!last) return null;
  return `${nappyKind(last.details)} · ${formatAgo(now.getTime() - Date.parse(last.startedAt))}`;
}

export interface ChairFeedView {
  paused: boolean;
  side: Side;
  title: string;
  timer: string;
  sides: string;
  pausedFor: string | null;
  idle: string | null;
}

export function chairFeedView(feed: BreastFeed, now: Date, mergeGapMs: number): ChairFeedView {
  const totals = segmentTotals(feed.segments, now);
  const side = totals.openSide ?? totals.lastSide ?? 'left';
  const paused = totals.openSide === null;
  const pausedSince = paused ? lastSegmentEnd(feed) : null;
  const pausedMs = paused ? pausedForMs(feed.segments, now) : null;
  const { downtimeMs } = summariseSegments(feed.segments, {
    mergeGapMs,
    now,
    pausedSince: pausedSince === null ? null : new Date(pausedSince).toISOString(),
  });
  return {
    paused,
    side,
    title: `${paused ? 'Paused' : 'Feeding'} · ${SIDE_LABEL[side]}`,
    timer: formatTimer(totals.activeMs),
    sides: `Left ${formatTimer(totals.leftMs)} · Right ${formatTimer(totals.rightMs)}`,
    pausedFor:
      pausedMs === null
        ? null
        : pausedMs < MINUTE_MS
          ? 'Just paused'
          : `Paused ${formatDuration(pausedMs, { seconds: false })}`,
    idle: downtimeMs > 0 ? `Idle ${formatTimer(downtimeMs)}` : null,
  };
}

export function chairFeedSummary(
  feed: BreastFeed,
  endedAt: Date,
  mergeGapMs: number,
): { title: string; sides: string } {
  const totals = segmentTotals(feed.segments, endedAt);
  const { downtimeMs } = summariseSegments(feed.segments, { mergeGapMs, now: endedAt });
  const parts = (['left', 'right'] as const)
    .map((side) => ({ side, ms: side === 'left' ? totals.leftMs : totals.rightMs }))
    .filter(({ ms }) => ms >= MINUTE_MS)
    .map(({ side, ms }) => `${SIDE_LABEL[side]} ${formatDuration(ms, { seconds: false })}`);
  if (downtimeMs >= MINUTE_MS) parts.push(`idle ${formatDuration(downtimeMs, { seconds: false })}`);
  return { title: `Fed ${formatDuration(totals.activeMs, { seconds: false })}`, sides: parts.join(' · ') };
}

export function secondsLeft(untilMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((untilMs - nowMs) / 1000));
}

export function bottleStep(units: Units): number {
  return units === 'metric' ? 10 : 0.5;
}

function bottleLimits(units: Units): { min: number; max: number } {
  return units === 'metric' ? { min: 10, max: 400 } : { min: 0.5, max: 14 };
}

function roundToStep(value: number, units: Units): number {
  const step = bottleStep(units);
  const { min, max } = bottleLimits(units);
  return Math.min(max, Math.max(min, Math.round(value / step) * step));
}

export function stepBottleAmount(amount: number, direction: 1 | -1, units: Units): number {
  return roundToStep(amount + direction * bottleStep(units), units);
}

export function defaultBottleAmount(events: readonly BabyEvent[], units: Units): number {
  const last = events
    .filter((event): event is EventOfType<'bottle'> => event.type === 'bottle' && !event.deletedAt)
    .filter((event) => event.details.amountMl !== null)
    .sort(byStartedAtDesc)[0];
  if (!last) return units === 'metric' ? 120 : 4;
  const ml = last.details.amountMl!;
  return roundToStep(units === 'metric' ? ml : ml / ML_PER_OUNCE, units);
}

export function defaultBottleContent(events: readonly BabyEvent[]): BottleContent {
  const last = events
    .filter((event): event is EventOfType<'bottle'> => event.type === 'bottle' && !event.deletedAt)
    .sort(byStartedAtDesc)[0];
  return last && last.details.content !== 'other' ? last.details.content : 'breast_milk';
}

export function formatBottleAmount(amount: number): string {
  return String(Math.round(amount * 10) / 10);
}

export function chairBottleDraft(amount: number, content: BottleContent, units: Units, now: Date): EventDraft {
  const draft = emptyDraft('bottle', now);
  return { ...draft, details: { ...draft.details, content, amountMl: volumeToMl(amount, units) } };
}

export function chairNappyDraft(type: NappyType, now: Date): EventDraft {
  const draft = emptyDraft('nappy', now);
  return { ...draft, details: withNappyType(draft.details, type) };
}

export function chairIsNight(night: NightWindow | null, now: Date): boolean {
  return night !== null && isWithinNight(now, night.timeZone, night.start, night.end);
}

export function chairDimmed(night: NightWindow | null, now: Date, lastTouchAt: number): boolean {
  const idleMs = now.getTime() - lastTouchAt;
  return idleMs >= CHAIR_IDLE_DIM_MS || (idleMs >= CHAIR_WAKE_MS && chairIsNight(night, now));
}

export function screenOffMinutes(value: unknown): number | undefined {
  const minutes = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(minutes) && minutes > 0 ? minutes : undefined;
}

export function tapWakesScreen(screenOffMinutes: number | undefined, now: number, lastTouchAt: number): boolean {
  return screenOffMinutes !== undefined && now - lastTouchAt >= screenOffMinutes * MINUTE_MS - SCREEN_OFF_SLACK_MS;
}
