import { formatDuration } from '../format/duration';
import { formatTimeOfDay } from '../time/local-time';
import type { TimelineTip } from '../timeline/item-label';
import { fractionOf, type TimeWindow } from '../time/windows';
import type { BabyEvent } from '../events/types';
import { ageInMonths } from '../growth/growth';
import { predictDay, type PredictedBlock, type PredictedKind, type PredictedWindow } from './predict-day';
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../time/constants';

export const PREDICTION_HORIZON_MS = 4 * HOUR_MS;
const LOOKBACK_MS = 7 * DAY_MS;
const FADED_OPACITY = 0.35;
const NARROW_WINDOW_MS = 10 * MINUTE_MS;

export interface PredictedItem {
  kind: PredictedKind;
  startFrac: number;
  endFrac: number;
  opacity: number;
  label: string;
  tip: TimelineTip;
}

const ESTIMATE_NOTE = 'Estimated from recent days';

export interface PredictionBaby {
  timeZone: string;
  birthDate?: string | null;
}

export function predictionSince(now: Date): string {
  return `${new Date(now.getTime() - LOOKBACK_MS).toISOString().slice(0, 13)}:00:00Z`;
}

export function predictAhead(events: readonly BabyEvent[], now: Date, baby: PredictionBaby): PredictedBlock[] | null {
  const ageMonths = baby.birthDate ? ageInMonths(baby.birthDate, now.toISOString(), baby.timeZone) : null;
  return predictDay(events, now, new Date(now.getTime() + PREDICTION_HORIZON_MS), {
    timeZone: baby.timeZone,
    ageMonths,
  });
}

function narrow(window: PredictedWindow | undefined): window is undefined {
  return !window || Date.parse(window.to) - Date.parse(window.from) < NARROW_WINDOW_MS;
}

function span(window: PredictedWindow, timeZone: string): string {
  return `${formatTimeOfDay(window.from, timeZone)}–${formatTimeOfDay(window.to, timeZone)}`;
}

export function predictionText(blocks: readonly PredictedBlock[] | null, now: Date, timeZone: string): string | null {
  const first = blocks?.[0];
  if (!first) return null;
  const nowMs = now.getTime();
  if (first.kind === 'sleep' && first.continuesRunning) {
    const window = first.endWindow;
    if (Date.parse(first.endedAt) > nowMs) {
      return narrow(window)
        ? `Likely awake around ${formatTimeOfDay(first.endedAt, timeZone)}`
        : `Likely awake ${span(window, timeZone)}`;
    }
    if (window && nowMs <= Date.parse(window.to)) return `Likely awake by ${formatTimeOfDay(window.to, timeZone)}`;
    return 'Sleeping longer than usual';
  }
  const sleep = blocks.find((block) => block.kind === 'sleep' && !block.continuesRunning);
  if (!sleep) return null;
  const window = sleep.startWindow;
  if (narrow(window)) return `Likely asleep around ${formatTimeOfDay(sleep.startedAt, timeZone)}`;
  if (nowMs < Date.parse(window.from)) return `Next sleep likely ${span(window, timeZone)}`;
  if (nowMs <= Date.parse(window.to)) return `Sleep window open until ${formatTimeOfDay(window.to, timeZone)}`;
  return 'Past the usual sleep window, likely ready now';
}

function blockLabel(block: PredictedBlock, timeZone: string): string {
  const range = `${formatTimeOfDay(block.startedAt, timeZone)}–${formatTimeOfDay(block.endedAt, timeZone)}`;
  return `${block.kind === 'sleep' ? 'Likely asleep' : 'Likely feeding'} ${range}`;
}

function uncertainWindow(block: PredictedBlock): PredictedWindow | undefined {
  const window = block.continuesRunning ? block.endWindow : block.startWindow;
  return narrow(window) ? undefined : window;
}

export function predictedItemTip(block: PredictedBlock, now: Date, timeZone: string): TimelineTip {
  const sleep = block.kind === 'sleep';
  const [startWord, endWord] = sleep ? ['Down', 'Up'] : ['Starts', 'Ends'];
  const at = (iso: string) => formatTimeOfDay(iso, timeZone);
  const window = uncertainWindow(block);
  const likely = window ? ` · likely ${at(window.from)} – ${at(window.to)}` : '';
  if (block.continuesRunning) {
    const nowMs = now.getTime();
    const line =
      Date.parse(block.endedAt) > nowMs
        ? `${endWord} ${at(block.endedAt)}${likely}`
        : block.endWindow && nowMs <= Date.parse(block.endWindow.to)
          ? `${endWord} by ${at(block.endWindow.to)}`
          : 'Longer than usual';
    return { title: `${sleep ? 'Sleep' : 'Feed'} still going`, lines: [line, ESTIMATE_NOTE] };
  }
  const length = formatDuration(Date.parse(block.endedAt) - Date.parse(block.startedAt), { seconds: false });
  return {
    title: `Likely ${sleep ? 'sleep' : 'feed'}`,
    lines: [
      `${startWord} ${at(block.startedAt)}${likely}`,
      `${endWord} ${at(block.endedAt)} · ${length}`,
      ESTIMATE_NOTE,
    ],
  };
}

export function predictedLayout(
  blocks: readonly PredictedBlock[] | null,
  window: TimeWindow,
  now: Date,
  timeZone: string,
): { sleep: PredictedItem[]; feeds: PredictedItem[] } {
  const layout: { sleep: PredictedItem[]; feeds: PredictedItem[] } = { sleep: [], feeds: [] };
  for (const block of blocks ?? []) {
    const start = Date.parse(block.startedAt);
    const end = Math.max(start, Date.parse(block.endedAt));
    if (end <= window.start.getTime() || start >= window.end.getTime()) continue;
    const ahead = Math.min(1, Math.max(0, start - now.getTime()) / PREDICTION_HORIZON_MS);
    (block.kind === 'sleep' ? layout.sleep : layout.feeds).push({
      kind: block.kind,
      startFrac: fractionOf(window, start),
      endFrac: fractionOf(window, end),
      opacity: 1 - (1 - FADED_OPACITY) * ahead,
      label: blockLabel(block, timeZone),
      tip: predictedItemTip(block, now, timeZone),
    });
  }
  return layout;
}
