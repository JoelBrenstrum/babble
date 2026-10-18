import { formatTimeOfDay } from '../time/local-time';
import { fractionOf, type TimeWindow } from '../time/windows';
import type { BabyEvent } from '../events/types';
import { predictDay, type PredictedBlock, type PredictedKind } from './predict-day';
import { DAY_MS, HOUR_MS } from '../time/constants';

export const PREDICTION_HORIZON_MS = 4 * HOUR_MS;
const LOOKBACK_MS = 7 * DAY_MS;
const FADED_OPACITY = 0.35;

export interface PredictedItem {
  kind: PredictedKind;
  startFrac: number;
  endFrac: number;
  opacity: number;
  label: string;
}

export function predictionSince(now: Date): string {
  return `${new Date(now.getTime() - LOOKBACK_MS).toISOString().slice(0, 13)}:00:00Z`;
}

export function predictAhead(events: readonly BabyEvent[], now: Date, timeZone: string): PredictedBlock[] | null {
  return predictDay(events, now, new Date(now.getTime() + PREDICTION_HORIZON_MS), { timeZone });
}

export function predictionText(blocks: readonly PredictedBlock[] | null, timeZone: string): string | null {
  const first = blocks?.[0];
  if (!first) return null;
  if (first.kind === 'sleep' && first.continuesRunning) {
    return `Likely awake around ${formatTimeOfDay(first.endedAt, timeZone)}`;
  }
  const sleep = blocks.find((block) => block.kind === 'sleep' && !block.continuesRunning);
  return sleep ? `Likely asleep around ${formatTimeOfDay(sleep.startedAt, timeZone)}` : null;
}

function blockLabel(block: PredictedBlock, timeZone: string): string {
  const range = `${formatTimeOfDay(block.startedAt, timeZone)}–${formatTimeOfDay(block.endedAt, timeZone)}`;
  return `${block.kind === 'sleep' ? 'Likely asleep' : 'Likely feeding'} ${range}`;
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
    const end = Date.parse(block.endedAt);
    if (end <= window.start.getTime() || start >= window.end.getTime()) continue;
    const ahead = Math.min(1, Math.max(0, start - now.getTime()) / PREDICTION_HORIZON_MS);
    (block.kind === 'sleep' ? layout.sleep : layout.feeds).push({
      kind: block.kind,
      startFrac: fractionOf(window, start),
      endFrac: fractionOf(window, end),
      opacity: 1 - (1 - FADED_OPACITY) * ahead,
      label: blockLabel(block, timeZone),
    });
  }
  return layout;
}
