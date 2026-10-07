import type { EventDraft, ImportedEvent } from '@babble/domain';
import type { BabbleClient } from './client';
import { unwrap } from './errors';
import { draftToPayload } from './events';

export const IMPORT_BATCH_SIZE = 200;

export function importPayload(event: ImportedEvent, babyId: string) {
  const { sourceRef, line: _line, ...draft } = event;
  return draftToPayload(draft as EventDraft, { babyId, source: 'huckleberry_csv', sourceRef });
}

export async function importEvents(
  client: BabbleClient,
  babyId: string,
  events: readonly ImportedEvent[],
  onProgress?: (progress: { done: number; total: number }) => void,
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;
  for (let start = 0; start < events.length; start += IMPORT_BATCH_SIZE) {
    const batch = events.slice(start, start + IMPORT_BATCH_SIZE).map((event) => importPayload(event, babyId));
    const [result] = unwrap(await client.rpc('import_events', { target_baby_id: babyId, events: batch }));
    imported += result?.imported ?? 0;
    skipped += result?.skipped ?? 0;
    onProgress?.({ done: Math.min(events.length, start + IMPORT_BATCH_SIZE), total: events.length });
  }
  return { imported, skipped };
}
