import { emptyDraft } from '../events/drafts';
import { withNappyType, type NappyType } from '../events/nappy';
import { pausedForMs } from '../events/session-context';
import { segmentTotals } from '../events/segments';
import type { BabyEvent, BottleContent, EventDraft, EventOfType, Side, Units } from '../events/types';
import { formatAgo, formatDuration, formatTimer } from '../format/duration';
import { formatVolume, volumeToMl } from '../format/units';
import { isWithinNight } from '../time/local-time';
import { nappyKind } from '../timeline/totals';
import type { NightWindow } from '../theme/theme-preference';

const SIDE_LABEL: Record<Side, string> = { left: 'Left', right: 'Right' };
const ML_PER_OUNCE = 29.5735;

export const CHAIR_WAKE_MS = 30_000;
export const CHAIR_UNDO_MS = 5_000;
export const CHAIR_IDLE_DIM_MS = 5 * 60_000;

type BreastFeed = EventOfType<'breast_feed'>;

export function runningBreastFeed(running: readonly BabyEvent[]): BreastFeed | null {
  return (running.find((event) => event.type === 'breast_feed' && !event.endedAt && !event.deletedAt) ??
    null) as BreastFeed | null;
}

export function lastFeedLine(events: readonly BabyEvent[], now: Date, units: Units): string {
  const last = events
    .filter((event) => !event.deletedAt && (event.type === 'bottle' || (event.type === 'breast_feed' && event.endedAt)))
    .sort((a, b) => Date.parse(b.endedAt ?? b.startedAt) - Date.parse(a.endedAt ?? a.startedAt))[0];
  if (!last) return 'No feeds logged yet';
  const ago = `Last fed ${formatAgo(now.getTime() - Date.parse(last.endedAt ?? last.startedAt))}`;
  if (last.type === 'bottle') {
    const amount = last.details.amountMl === null ? null : formatVolume(last.details.amountMl, units);
    return amount ? `${ago} · Bottle · ${amount}` : `${ago} · Bottle`;
  }
  if (last.type !== 'breast_feed') return ago;
  const totals = segmentTotals(last.segments, now);
  const side = totals.lastSide ? ` · ${SIDE_LABEL[totals.lastSide]} side` : '';
  const length = totals.activeMs >= 60_000 ? ` · ${formatDuration(totals.activeMs, { seconds: false })}` : '';
  return `${ago}${side}${length}`;
}

export function lastNappyLine(events: readonly BabyEvent[], now: Date): string | null {
  const last = events
    .filter((event): event is EventOfType<'nappy'> => event.type === 'nappy' && !event.deletedAt)
    .filter((event) => !event.details.typePending)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
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
}

export function chairFeedView(feed: BreastFeed, now: Date): ChairFeedView {
  const totals = segmentTotals(feed.segments, now);
  const side = totals.openSide ?? totals.lastSide ?? 'left';
  const paused = totals.openSide === null;
  const pausedMs = paused ? pausedForMs(feed.segments, now) : null;
  return {
    paused,
    side,
    title: `${paused ? 'Paused' : 'Feeding'} · ${SIDE_LABEL[side]}`,
    timer: formatTimer(totals.activeMs),
    sides: `Left ${formatTimer(totals.leftMs)} · Right ${formatTimer(totals.rightMs)}`,
    pausedFor:
      pausedMs === null
        ? null
        : pausedMs < 60_000
          ? 'Just paused'
          : `Paused ${formatDuration(pausedMs, { seconds: false })}`,
  };
}

export function chairFeedSummary(feed: BreastFeed, endedAt: Date): { title: string; sides: string } {
  const totals = segmentTotals(feed.segments, endedAt);
  const parts = (['left', 'right'] as const)
    .map((side) => ({ side, ms: side === 'left' ? totals.leftMs : totals.rightMs }))
    .filter(({ ms }) => ms >= 60_000)
    .map(({ side, ms }) => `${SIDE_LABEL[side]} ${formatDuration(ms, { seconds: false })}`);
  return { title: `Fed ${formatDuration(totals.activeMs, { seconds: false })}`, sides: parts.join(' · ') };
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
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  if (!last) return units === 'metric' ? 120 : 4;
  const ml = last.details.amountMl!;
  return roundToStep(units === 'metric' ? ml : ml / ML_PER_OUNCE, units);
}

export function defaultBottleContent(events: readonly BabyEvent[]): BottleContent {
  const last = events
    .filter((event): event is EventOfType<'bottle'> => event.type === 'bottle' && !event.deletedAt)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
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
