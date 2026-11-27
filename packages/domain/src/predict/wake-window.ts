import { formatDuration } from '../format/duration';
import { DAYS_PER_MONTH } from '../growth/growth';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../time/constants';
import { formatTimeOfDay } from '../time/local-time';

export const ROUTINE_AGE_WEEKS = 13;
export const ROUTINE_AGE_MONTHS = (ROUTINE_AGE_WEEKS * 7) / DAYS_PER_MONTH;

const FULL_NAP_MS = 60 * MINUTE_MS;
const SHORTEST_NAP_MS = 20 * MINUTE_MS;
const MAX_CUT = 0.3;
const GOOD_NIGHT_FLOOR_MS = 9 * HOUR_MS;
const GOOD_NIGHT_UNLEARNED_MS = 10 * HOUR_MS;
const MIN_NIGHTS = 3;
const SAME_NIGHT_GAP_MS = 6 * HOUR_MS;
const GOOD_NIGHT_RELIEF = [1, 0.5];

export type WakeWindowReason = 'short-nap' | 'good-night';

export interface WakeRange {
  low: number;
  mid: number;
  high: number;
}

export interface WakeWindow {
  wokeAt: string;
  from: string;
  to: string;
  reason: WakeWindowReason | null;
  napMs: number | null;
}

export interface SleepSpan {
  start: number;
  end: number;
  night: boolean;
}

export interface WakeContext {
  napMs: number | null;
  shortNapsToday: number;
  goodNight: boolean;
}

export function isRoutineAge(ageMonths: number | null): boolean {
  return ageMonths === null || ageMonths >= ROUTINE_AGE_MONTHS;
}

export function shortNapCut(napMs: number): number {
  if (napMs >= FULL_NAP_MS) return 0;
  const shortfall = (FULL_NAP_MS - Math.max(napMs, SHORTEST_NAP_MS)) / (FULL_NAP_MS - SHORTEST_NAP_MS);
  return MAX_CUT * shortfall;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function nightTotals(sleeps: readonly SleepSpan[]): number[] {
  const totals: number[] = [];
  let previous: SleepSpan | null = null;
  for (const sleep of sleeps) {
    if (sleep.night) {
      const sameNight = previous?.night && sleep.start - previous.end < SAME_NIGHT_GAP_MS;
      if (sameNight) totals[totals.length - 1]! += sleep.end - sleep.start;
      else totals.push(sleep.end - sleep.start);
    }
    previous = sleep;
  }
  return totals;
}

export function wakeContext(sleeps: readonly SleepSpan[]): WakeContext {
  const last = sleeps.at(-1);
  if (!last || last.night) return { napMs: null, shortNapsToday: 0, goodNight: false };
  let firstNap = sleeps.length - 1;
  while (firstNap > 0 && !sleeps[firstNap - 1]!.night && last.end - sleeps[firstNap - 1]!.start < DAY_MS) {
    firstNap -= 1;
  }
  const naps = sleeps.slice(firstNap);
  const nights = nightTotals(sleeps.slice(0, firstNap));
  const lastNight = sleeps[firstNap - 1]?.night ? nights.at(-1) : undefined;
  const earlier = nights.slice(0, -1);
  const needed =
    earlier.length >= MIN_NIGHTS ? Math.max(GOOD_NIGHT_FLOOR_MS, median(earlier)) : GOOD_NIGHT_UNLEARNED_MS;
  return {
    napMs: last.end - last.start,
    shortNapsToday: naps.filter((nap) => nap.end - nap.start < FULL_NAP_MS).length,
    goodNight: lastNight !== undefined && lastNight >= needed,
  };
}

export function adjustWakeRange(
  range: WakeRange,
  context: WakeContext,
): { range: WakeRange; reason: WakeWindowReason | null } {
  const cut = context.napMs === null ? 0 : shortNapCut(context.napMs);
  if (cut === 0) return { range, reason: null };
  const relief = context.goodNight ? (GOOD_NIGHT_RELIEF[context.shortNapsToday - 1] ?? 0) : 0;
  if (relief === 1) return { range, reason: 'good-night' };
  const scale = 1 - cut * (1 - relief);
  const shrink = (ms: number) => Math.round((ms * scale) / MINUTE_MS) * MINUTE_MS;
  return { range: { low: shrink(range.low), mid: shrink(range.mid), high: shrink(range.high) }, reason: 'short-nap' };
}

const short = (ms: number) => formatDuration(ms, { seconds: false });

function reasonNote(window: WakeWindow): string {
  if (window.napMs === null || !window.reason) return '';
  return window.reason === 'short-nap'
    ? ` · shorter after a ${short(window.napMs)} nap`
    : ` · a good night makes up for the ${short(window.napMs)} nap`;
}

export function wakeWindowText(window: WakeWindow, now: Date, timeZone: string): { text: string; overdue: boolean } {
  const woke = Date.parse(window.wokeAt);
  const from = Date.parse(window.from);
  const to = Date.parse(window.to);
  const nowMs = now.getTime();
  const range = `${short(from - woke)}–${short(to - woke)}`;
  const note = reasonNote(window);
  if (nowMs > to) {
    const over = nowMs - to;
    const by = over < MINUTE_MS ? '' : ` by ${short(over)}`;
    return { text: `Past the ${range} wake window${by} · likely ready for sleep${note}`, overdue: true };
  }
  if (nowMs >= from) {
    return {
      text: `Wake window ${range} · time to settle · asleep by ${formatTimeOfDay(window.to, timeZone)}${note}`,
      overdue: false,
    };
  }
  const wait = from - nowMs;
  const settle =
    wait < MINUTE_MS
      ? 'start settling now'
      : `start settling in ${short(wait)} · around ${formatTimeOfDay(window.from, timeZone)}`;
  return { text: `Wake window ${range} · ${settle}${note}`, overdue: false };
}
