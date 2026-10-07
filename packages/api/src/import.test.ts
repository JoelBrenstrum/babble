import type { ImportedEvent } from '@babble/domain';
import { describe, expect, it, vi } from 'vitest';
import { IMPORT_BATCH_SIZE, importEvents, importPayload } from './import';
import { fakeClient } from './test-utils';

function nappy(index: number): ImportedEvent {
  return {
    type: 'nappy',
    startedAt: '2026-10-01T10:00:00.000Z',
    endedAt: '2026-10-01T10:00:00.000Z',
    notes: null,
    details: { wet: true, dirty: false, wetSize: null, pooSize: null, pooColours: [], pooTextures: [], rash: false },
    sourceRef: `ref-${index}`,
    line: index + 2,
  };
}

describe('importPayload', () => {
  it('tags the event with its source and drops the line number', () => {
    const payload = importPayload(nappy(0), 'baby-1');
    expect(payload).toMatchObject({ baby_id: 'baby-1', type: 'nappy', source: 'huckleberry_csv', source_ref: 'ref-0' });
    expect(payload).not.toHaveProperty('line');
  });
});

describe('importEvents', () => {
  it('sends batches and totals the results', async () => {
    const { client, requests } = fakeClient(() => ({ body: [{ imported: 150, skipped: 50 }] }));
    const onProgress = vi.fn();
    const events = Array.from({ length: IMPORT_BATCH_SIZE + 10 }, (_, index) => nappy(index));
    const result = await importEvents(client, 'baby-1', events, onProgress);
    expect(requests).toHaveLength(2);
    expect(requests[0]!.url.pathname).toBe('/rest/v1/rpc/import_events');
    expect((requests[0]!.body as { events: unknown[] }).events).toHaveLength(IMPORT_BATCH_SIZE);
    expect((requests[1]!.body as { events: unknown[] }).events).toHaveLength(10);
    expect(result).toEqual({ imported: 300, skipped: 100 });
    expect(onProgress).toHaveBeenLastCalledWith({ done: IMPORT_BATCH_SIZE + 10, total: IMPORT_BATCH_SIZE + 10 });
  });
});
