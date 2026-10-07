import type { BabyEvent, EventType } from '../events/types';
import type { HuckleberryImport } from './import';

export interface ImportSummary {
  total: number;
  byType: Partial<Record<EventType, number>>;
  firstAt: string | null;
  lastAt: string | null;
  skipped: number;
  warnings: number;
}

export function summariseImport(result: HuckleberryImport): ImportSummary {
  const byType: Partial<Record<EventType, number>> = {};
  let firstAt: string | null = null;
  let lastAt: string | null = null;
  for (const event of result.events) {
    byType[event.type] = (byType[event.type] ?? 0) + 1;
    if (!firstAt || event.startedAt < firstAt) firstAt = event.startedAt;
    if (!lastAt || event.startedAt > lastAt) lastAt = event.startedAt;
  }
  return {
    total: result.events.length,
    byType,
    firstAt,
    lastAt,
    skipped: result.skipped.length,
    warnings: result.warnings.length,
  };
}

export function importedNote(event: Pick<BabyEvent, 'type' | 'source'>): string | null {
  if (event.source !== 'huckleberry_csv') return null;
  if (event.type !== 'breast_feed' && event.type !== 'pump') return null;
  return "Imported from Huckleberry. Side order and downtime aren't known.";
}
