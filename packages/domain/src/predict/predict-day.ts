import { minutesOfDay } from '../time/local-time';
import type { BabyEvent } from '../events/types';
import { DAY_MS, MINUTE_MS } from '../time/constants';
import { priorsForAge, type AgePriors, type Prior } from './age-priors';

export type PredictedKind = 'sleep' | 'feed';

export interface PredictedWindow {
  from: string;
  to: string;
}

export interface PredictedBlock {
  kind: PredictedKind;
  startedAt: string;
  endedAt: string;
  continuesRunning: boolean;
  startWindow?: PredictedWindow;
  endWindow?: PredictedWindow;
}

interface Episode {
  kind: PredictedKind;
  start: number;
  end: number | null;
}

interface Sample {
  at: number;
  minuteOfDay: number;
  value: number;
}

export interface Rhythm {
  feedLength: Sample[];
  feedToSleep: Sample[];
  sleepLength: Sample[];
  wakeToFeed: Sample[];
  wakeToSleep: Sample[];
}

type RhythmKey = keyof Rhythm;

export interface PredictOptions {
  timeZone: string;
  ageMonths?: number | null;
  lookbackDays?: number;
  halfLifeDays?: number;
  hourSpreadMinutes?: number;
  mergeGapMinutes?: number;
  minSamples?: number;
}

export interface Quantiles {
  low: number;
  mid: number;
  high: number;
}

const OVERRUN_MS = 10 * MINUTE_MS;
const MIN_BLOCK_MS = 5 * MINUTE_MS;
const SHORT_NAP_FRACTION = 0.5;
const NEAR_PLANNED_WAKE_MS = 15 * MINUTE_MS;
const PRIOR_WEIGHT = 2;
const LEARNED_KEYS: readonly RhythmKey[] = ['feedLength', 'feedToSleep', 'sleepLength', 'wakeToFeed'];

const DEFAULTS = {
  lookbackDays: 7,
  halfLifeDays: 3,
  hourSpreadMinutes: 180,
  mergeGapMinutes: 15,
  minSamples: 6,
};

const ANY_VALUE = -1;

function resolveOptions(options: PredictOptions): Required<PredictOptions> {
  return {
    timeZone: options.timeZone,
    ageMonths: options.ageMonths ?? null,
    lookbackDays: options.lookbackDays ?? DEFAULTS.lookbackDays,
    halfLifeDays: options.halfLifeDays ?? DEFAULTS.halfLifeDays,
    hourSpreadMinutes: options.hourSpreadMinutes ?? DEFAULTS.hourSpreadMinutes,
    mergeGapMinutes: options.mergeGapMinutes ?? DEFAULTS.mergeGapMinutes,
    minSamples: options.minSamples ?? DEFAULTS.minSamples,
  };
}

function lastOfKind(list: readonly Episode[], kind: PredictedKind): Episode | undefined {
  for (let index = list.length - 1; index >= 0; index -= 1) if (list[index]!.kind === kind) return list[index];
  return undefined;
}

function episodes(events: readonly BabyEvent[], now: number, mergeGapMs: number): Episode[] {
  const raw: Episode[] = events
    .filter((event) => !event.deletedAt && Date.parse(event.startedAt) <= now)
    .flatMap((event): Episode[] => {
      const start = Date.parse(event.startedAt);
      const end = event.endedAt ? Date.parse(event.endedAt) : null;
      if (event.type === 'sleep') return [{ kind: 'sleep', start, end }];
      if (event.type === 'breast_feed' || event.type === 'bottle') return [{ kind: 'feed', start, end }];
      return [];
    })
    .sort((a, b) => a.start - b.start);

  const merged: Episode[] = [];
  for (const episode of raw) {
    const previous = lastOfKind(merged, episode.kind);
    const interrupted = merged.at(-1) !== previous;
    if (previous && previous.end !== null && !interrupted && episode.start - previous.end <= mergeGapMs) {
      merged[merged.length - 1] = {
        ...previous,
        end: episode.end === null ? null : Math.max(previous.end, episode.end),
      };
    } else {
      merged.push(episode);
    }
  }
  return merged;
}

export function learnRhythm(events: readonly BabyEvent[], now: Date, options: PredictOptions): Rhythm {
  const settings = resolveOptions(options);
  return rhythmFrom(episodes(events, now.getTime(), settings.mergeGapMinutes * MINUTE_MS), now.getTime(), settings);
}

function rhythmFrom(history: readonly Episode[], nowMs: number, settings: Required<PredictOptions>): Rhythm {
  const from = nowMs - settings.lookbackDays * DAY_MS;
  const all = history.filter((e) => e.end !== null);
  const sample = (at: number, value: number): Sample => ({
    at,
    minuteOfDay: minutesOfDay(new Date(at), settings.timeZone),
    value,
  });
  const rhythm: Rhythm = { feedLength: [], feedToSleep: [], sleepLength: [], wakeToFeed: [], wakeToSleep: [] };

  all.forEach((episode, index) => {
    if (episode.start < from) return;
    const later = all.slice(index + 1);
    if (episode.kind === 'feed') {
      rhythm.feedLength.push(sample(episode.start, episode.end! - episode.start));
      const nextFeed = later.find((e) => e.kind === 'feed');
      const sleep = later.find((e) => e.kind === 'sleep');
      if (sleep && (!nextFeed || sleep.start < nextFeed.start)) {
        rhythm.feedToSleep.push(sample(episode.start, sleep.start - episode.start));
      }
    } else {
      const wake = episode.end!;
      rhythm.sleepLength.push(sample(episode.start, wake - episode.start));
      const next = later[0];
      if (next?.kind === 'feed') rhythm.wakeToFeed.push(sample(wake, Math.max(0, next.start - wake)));
      const nextSleep = later.find((e) => e.kind === 'sleep');
      if (nextSleep) rhythm.wakeToSleep.push(sample(wake, nextSleep.start - wake));
    }
  });
  return rhythm;
}

function circularMinutes(a: number, b: number): number {
  const diff = Math.abs(a - b) % 1440;
  return Math.min(diff, 1440 - diff);
}

export function weightedQuantile(values: readonly { value: number; weight: number }[], q: number): number | null {
  const sorted = values.filter((v) => v.weight > 0).sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, v) => sum + v.weight, 0);
  if (total === 0) return null;
  let running = 0;
  for (const v of sorted) {
    running += v.weight;
    if (running >= total * q) return v.value;
  }
  return sorted.at(-1)!.value;
}

export function weightedMedian(values: readonly { value: number; weight: number }[]): number | null {
  return weightedQuantile(values, 0.5);
}

export function blendWithPrior(observed: Quantiles | null, prior: Prior | null, weight: number): Quantiles | null {
  if (!prior) return observed;
  if (!observed) return prior;
  const trust = weight / (weight + PRIOR_WEIGHT);
  const mix = (a: number, b: number) => Math.round(trust * a + (1 - trust) * b);
  return { low: mix(observed.low, prior.low), mid: mix(observed.mid, prior.mid), high: mix(observed.high, prior.high) };
}

function estimate(
  samples: readonly Sample[],
  prior: Prior | null,
  at: number,
  now: number,
  settings: Required<PredictOptions>,
  above: number,
): Quantiles | null {
  const minute = minutesOfDay(new Date(at), settings.timeZone);
  const weighted = samples
    .filter((s) => s.value > above)
    .map((s) => {
      const hours = circularMinutes(s.minuteOfDay, minute);
      const age = Math.max(0, now - s.at) / DAY_MS;
      return {
        value: s.value,
        weight:
          Math.exp(-(hours * hours) / (2 * settings.hourSpreadMinutes ** 2)) * 0.5 ** (age / settings.halfLifeDays),
      };
    });
  const weight = weighted.reduce((sum, v) => sum + v.weight, 0);
  const observed =
    weight > 0
      ? {
          low: weightedQuantile(weighted, 0.25)!,
          mid: weightedQuantile(weighted, 0.5)!,
          high: weightedQuantile(weighted, 0.75)!,
        }
      : null;
  return blendWithPrior(observed, prior, weight);
}

export type PredictionResult =
  | { status: 'ready'; blocks: PredictedBlock[] }
  | { status: 'learning' }
  | { status: 'no-anchor' };

export function predictDay(
  events: readonly BabyEvent[],
  now: Date,
  until: Date,
  options: PredictOptions,
): PredictedBlock[] | null {
  const result = predictDayStatus(events, now, until, options);
  return result.status === 'ready' ? result.blocks : null;
}

interface Next {
  kind: PredictedKind;
  at: number;
  window: PredictedWindow | undefined;
}

export function predictDayStatus(
  events: readonly BabyEvent[],
  now: Date,
  until: Date,
  options: PredictOptions,
): PredictionResult {
  const settings = resolveOptions(options);
  const nowMs = now.getTime();
  const history = episodes(events, nowMs, settings.mergeGapMinutes * MINUTE_MS);
  const rhythm = rhythmFrom(history, nowMs, settings);
  const priors: AgePriors | null = settings.ageMonths === null ? null : priorsForAge(settings.ageMonths);
  if (!priors && LEARNED_KEYS.some((key) => rhythm[key].length < settings.minSamples)) {
    return { status: 'learning' };
  }

  const iso = (ms: number) => new Date(ms).toISOString();
  const blocks: PredictedBlock[] = [];
  const push = (
    kind: PredictedKind,
    start: number,
    end: number,
    extra: { continuesRunning?: boolean; startWindow?: PredictedWindow; endWindow?: PredictedWindow } = {},
  ) => {
    const block: PredictedBlock = {
      kind,
      startedAt: iso(start),
      endedAt: iso(extra.continuesRunning ? end : Math.max(end, start + MIN_BLOCK_MS)),
      continuesRunning: extra.continuesRunning ?? false,
    };
    if (extra.startWindow) block.startWindow = extra.startWindow;
    if (extra.endWindow) block.endWindow = extra.endWindow;
    blocks.push(block);
  };

  const quantiles = (key: RhythmKey, at: number) =>
    estimate(
      rhythm[key],
      key === 'feedToSleep' ? null : (priors?.[key] ?? null),
      at,
      nowMs,
      settings,
      key === 'wakeToFeed' ? ANY_VALUE : 0,
    );
  const windowAt = (anchor: number, q: Quantiles | null): PredictedWindow | undefined =>
    q ? { from: iso(anchor + q.low), to: iso(anchor + q.high) } : undefined;
  const length = (key: RhythmKey, at: number) => quantiles(key, at)?.mid ?? 0;
  const sinceAnchor = (key: RhythmKey, anchor: number): { at: number; window: PredictedWindow | undefined } | null => {
    const typical = quantiles(key, anchor);
    return typical ? { at: anchor + typical.mid, window: windowAt(anchor, typical) } : null;
  };
  const notBeforeNow = (time: number) => Math.max(time, nowMs);

  const sleepAfter = (wake: number | null, feed: { start: number; end: number } | null): Next => {
    const fromWake = wake === null ? null : sinceAnchor('wakeToSleep', wake);
    if (fromWake) {
      const floor = feed ? feed.end + MIN_BLOCK_MS : 0;
      return { kind: 'sleep', at: notBeforeNow(Math.max(fromWake.at, floor)), window: fromWake.window };
    }
    const fromFeed = feed ? sinceAnchor('feedToSleep', feed.start) : null;
    if (fromFeed && feed) {
      return {
        kind: 'sleep',
        at: notBeforeNow(Math.max(fromFeed.at, feed.end + MIN_BLOCK_MS)),
        window: fromFeed.window,
      };
    }
    return { kind: 'sleep', at: nowMs + OVERRUN_MS, window: undefined };
  };
  const feedAfter = (wake: number): Next => ({
    kind: 'feed',
    at: notBeforeNow(wake + length('wakeToFeed', wake)),
    window: windowAt(wake, quantiles('wakeToFeed', wake)),
  });
  const feedAfterSleep = (sleep: Episode, feedBefore: Episode | undefined): Next => {
    const wake = sleep.end!;
    const short = wake - sleep.start < length('sleepLength', sleep.start) * SHORT_NAP_FRACTION;
    if (!short || !feedBefore) return feedAfter(wake);
    const plannedSleep = feedBefore.start + length('feedToSleep', feedBefore.start);
    const plannedWake = plannedSleep + length('sleepLength', plannedSleep);
    if (wake >= plannedWake - NEAR_PLANNED_WAKE_MS) return feedAfter(wake);
    return feedAfter(plannedWake);
  };

  const running = history.filter((e) => e.end === null);
  const lastSleep = lastOfKind(history, 'sleep');
  const lastFeed = lastOfKind(history, 'feed');
  const runningSleep = running.find((e) => e.kind === 'sleep');
  const runningFeed = running.find((e) => e.kind === 'feed');

  let lastWake: number | null = lastSleep?.end ?? null;
  let next: Next;
  if (runningSleep) {
    const rest = sinceAnchor('sleepLength', runningSleep.start);
    const wake = rest?.at ?? nowMs + OVERRUN_MS;
    push('sleep', nowMs, wake, { continuesRunning: true, endWindow: rest?.window });
    lastWake = Math.max(wake, nowMs);
    next = feedAfter(lastWake);
  } else if (runningFeed) {
    const rest = sinceAnchor('feedLength', runningFeed.start);
    const end = rest?.at ?? nowMs + OVERRUN_MS;
    push('feed', nowMs, end, { continuesRunning: true, endWindow: rest?.window });
    next = sleepAfter(lastWake, { start: runningFeed.start, end: Math.max(end, nowMs) });
  } else if (lastFeed && (!lastSleep || lastFeed.start > lastSleep.start)) {
    next = sleepAfter(lastWake, { start: lastFeed.start, end: lastFeed.end! });
  } else if (lastSleep) {
    next = feedAfterSleep(lastSleep, lastFeed);
  } else {
    return { status: 'no-anchor' };
  }

  const limit = until.getTime();
  while (next.at < limit) {
    if (next.kind === 'feed') {
      const feedStart = next.at;
      const feedEnd = feedStart + length('feedLength', feedStart);
      push('feed', feedStart, feedEnd, { startWindow: next.window });
      next = sleepAfter(lastWake, { start: feedStart, end: Math.max(feedEnd, feedStart + MIN_BLOCK_MS) });
    } else {
      const sleepStart = next.at;
      const wake = sleepStart + Math.max(MIN_BLOCK_MS, length('sleepLength', sleepStart));
      push('sleep', sleepStart, wake, { startWindow: next.window });
      lastWake = wake;
      next = feedAfter(wake);
    }
  }
  return { status: 'ready', blocks: blocks.filter((block) => Date.parse(block.startedAt) < limit) };
}
