import { minutesOfDay } from '../time/local-time';
import type { BabyEvent } from '../events/types';
import { DAY_MS, MINUTE_MS } from '../time/constants';

export type PredictedKind = 'sleep' | 'feed';

export interface PredictedBlock {
  kind: PredictedKind;
  startedAt: string;
  endedAt: string;
  continuesRunning: boolean;
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
}

export interface PredictOptions {
  timeZone: string;
  lookbackDays?: number;
  halfLifeDays?: number;
  hourSpreadMinutes?: number;
  mergeGapMinutes?: number;
  minSamples?: number;
}

const OVERRUN_MS = 10 * MINUTE_MS;
const MIN_BLOCK_MS = 5 * MINUTE_MS;
const SHORT_NAP_FRACTION = 0.5;
const NEAR_PLANNED_WAKE_MS = 15 * MINUTE_MS;

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
  const rhythm: Rhythm = { feedLength: [], feedToSleep: [], sleepLength: [], wakeToFeed: [] };

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
      rhythm.sleepLength.push(sample(episode.start, episode.end! - episode.start));
      const next = later[0];
      if (next?.kind === 'feed') rhythm.wakeToFeed.push(sample(episode.end!, Math.max(0, next.start - episode.end!)));
    }
  });
  return rhythm;
}

function circularMinutes(a: number, b: number): number {
  const diff = Math.abs(a - b) % 1440;
  return Math.min(diff, 1440 - diff);
}

export function weightedMedian(values: readonly { value: number; weight: number }[]): number | null {
  const sorted = values.filter((v) => v.weight > 0).sort((a, b) => a.value - b.value);
  const total = sorted.reduce((sum, v) => sum + v.weight, 0);
  if (total === 0) return null;
  let running = 0;
  for (const v of sorted) {
    running += v.weight;
    if (running >= total / 2) return v.value;
  }
  return sorted.at(-1)!.value;
}

function estimate(
  samples: readonly Sample[],
  at: number,
  now: number,
  settings: Required<PredictOptions>,
  above = 0,
): number | null {
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
  return weightedMedian(weighted);
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
  if (Object.values(rhythm).some((samples: Sample[]) => samples.length < settings.minSamples)) {
    return { status: 'learning' };
  }

  const blocks: PredictedBlock[] = [];
  const push = (kind: PredictedKind, start: number, end: number, continuesRunning = false) =>
    blocks.push({
      kind,
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(Math.max(end, start + MIN_BLOCK_MS)).toISOString(),
      continuesRunning,
    });
  const remaining = (samples: Sample[], start: number) => {
    const elapsed = nowMs - start;
    const value = estimate(samples, start, nowMs, settings, elapsed);
    return start + (value ?? elapsed + OVERRUN_MS);
  };
  const length = (samples: Sample[], at: number, above = 0) => estimate(samples, at, nowMs, settings, above) ?? 0;
  const wakeToFeed = (wake: number) => length(rhythm.wakeToFeed, wake, ANY_VALUE);
  const notBeforeNow = (time: number) => Math.max(time, nowMs);
  const feedAfterSleep = (sleep: Episode, feedBefore: Episode | undefined) => {
    const wake = sleep.end!;
    const short = wake - sleep.start < length(rhythm.sleepLength, sleep.start) * SHORT_NAP_FRACTION;
    if (!short || !feedBefore) return wake + wakeToFeed(wake);
    const plannedSleep = feedBefore.start + length(rhythm.feedToSleep, feedBefore.start);
    const plannedWake = plannedSleep + length(rhythm.sleepLength, plannedSleep);
    if (wake >= plannedWake - NEAR_PLANNED_WAKE_MS) return wake + wakeToFeed(wake);
    return plannedWake + wakeToFeed(plannedWake);
  };

  const running = history.filter((e) => e.end === null);
  const lastSleep = lastOfKind(history, 'sleep');
  const lastFeed = lastOfKind(history, 'feed');
  const runningSleep = running.find((e) => e.kind === 'sleep');
  const runningFeed = running.find((e) => e.kind === 'feed');

  let next: { kind: PredictedKind; at: number };
  if (runningSleep) {
    const wake = remaining(rhythm.sleepLength, runningSleep.start);
    push('sleep', nowMs, wake, true);
    next = { kind: 'feed', at: wake + wakeToFeed(wake) };
  } else if (runningFeed) {
    const end = remaining(rhythm.feedLength, runningFeed.start);
    push('feed', nowMs, end, true);
    const sleepAt = remaining(rhythm.feedToSleep, runningFeed.start);
    next = { kind: 'sleep', at: Math.max(sleepAt, nowMs) };
  } else if (lastFeed && (!lastSleep || lastFeed.start > lastSleep.start)) {
    next = { kind: 'sleep', at: notBeforeNow(remaining(rhythm.feedToSleep, lastFeed.start)) };
  } else if (lastSleep) {
    next = { kind: 'feed', at: notBeforeNow(feedAfterSleep(lastSleep, lastFeed)) };
  } else {
    return { status: 'no-anchor' };
  }

  const limit = until.getTime();
  while (next.at < limit) {
    if (next.kind === 'feed') {
      const feedStart = next.at;
      push('feed', feedStart, feedStart + length(rhythm.feedLength, feedStart));
      next = { kind: 'sleep', at: feedStart + Math.max(MIN_BLOCK_MS, length(rhythm.feedToSleep, feedStart)) };
    } else {
      const sleepStart = next.at;
      const wake = sleepStart + Math.max(MIN_BLOCK_MS, length(rhythm.sleepLength, sleepStart));
      push('sleep', sleepStart, wake);
      next = { kind: 'feed', at: wake + wakeToFeed(wake) };
    }
  }
  return { status: 'ready', blocks: blocks.filter((block) => Date.parse(block.startedAt) < limit) };
}
