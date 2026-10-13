import { describe, expect, it } from 'vitest';
import { buildExport } from './export';
import { BabbleExportError, looksLikeJson, readBabbleExport } from './import-export';
import { importPayload } from './import';
import { sampleBaby, sampleEvents } from './fixtures';

const now = new Date('2026-10-09T02:00:00Z');

function exportText(events = sampleEvents(now)) {
  return JSON.stringify(
    buildExport({
      family: { id: 'family-1', name: 'The Smiths' },
      babies: [{ baby: { ...sampleBaby, created_at: '2026-09-26T00:00:00Z' }, settings: null, events }],
      exportedAt: now.toISOString(),
    }),
  );
}

describe('readBabbleExport', () => {
  it('reads each baby with its entries, keyed by the original id', () => {
    const [baby] = readBabbleExport(exportText());
    expect(baby).toMatchObject({
      name: sampleBaby.name,
      birthDate: sampleBaby.birth_date,
      timezone: sampleBaby.timezone,
    });
    expect(baby!.result.events).toHaveLength(sampleEvents(now).length);
    const feed = baby!.result.events.find((event) => event.type === 'breast_feed')!;
    expect(feed.sourceRef).toBe('event-feed-1');
    expect(feed).not.toHaveProperty('id');
    expect(feed).not.toHaveProperty('createdBy');
  });

  it('skips deleted, running and unknown entries and says why', () => {
    const [first, second] = sampleEvents(now);
    const [baby] = readBabbleExport(
      exportText([
        { ...first!, deletedAt: now.toISOString() },
        { ...second!, endedAt: null },
        { ...first!, id: 'odd', type: 'teleport' } as never,
      ]),
    );
    expect(baby!.result.events).toHaveLength(0);
    expect(baby!.result.skipped.map((row) => row.reason).sort()).toEqual([
      'Deleted before the export',
      'Not an entry babble recognises',
      'Still running when exported',
    ]);
  });

  it('turns entries into import payloads tagged as a babble export', () => {
    const [baby] = readBabbleExport(exportText());
    const payload = importPayload(baby!.result.events[0]!, 'baby-2', 'babble_export');
    expect(payload).toMatchObject({ baby_id: 'baby-2', source: 'babble_export' });
    expect(payload.source_ref).toBe(baby!.result.events[0]!.sourceRef);
  });

  it('rejects files that are not babble exports', () => {
    expect(() => readBabbleExport('not json')).toThrow(BabbleExportError);
    expect(() => readBabbleExport('{"format":"something-else"}')).toThrow('This does not look like a babble export.');
    expect(() => readBabbleExport('{"format":"babble-export","version":2,"babies":[]}')).toThrow(/different version/);
  });

  it('tells JSON from CSV', () => {
    expect(looksLikeJson('  {"format":"babble-export"}')).toBe(true);
    expect(looksLikeJson('Type,Start,End')).toBe(false);
  });
});
