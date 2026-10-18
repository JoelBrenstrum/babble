import { buildExport } from '@babble/api';
import { sampleBaby, sampleEvents, sampleSibling } from '@babble/api/fixtures';
import { MAX_IMPORT_BYTES } from '@babble/domain';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  exportedBabies,
  importProgressPercent,
  importTooBig,
  parseImportFile,
  readyImport,
  spansFamilies,
} from './import-file';

const now = new Date('2026-10-09T02:00:00Z');
const csv = readFileSync(
  resolve(process.cwd(), '../../packages/domain/src/huckleberry/__fixtures__/real-week.csv'),
  'utf8',
);

function exportText(babies = [sampleBaby]) {
  return JSON.stringify(
    buildExport({
      family: { id: 'family-1', name: 'The Smiths' },
      babies: babies.map((baby) => ({
        baby: { ...baby, created_at: '2026-09-26T00:00:00Z' },
        settings: null,
        events: sampleEvents(now),
      })),
      exportedAt: now.toISOString(),
    }),
  );
}

describe('parseImportFile', () => {
  it('reads a Huckleberry CSV in the given timezone', () => {
    const parsed = parseImportFile(csv, 'Pacific/Auckland');
    expect(parsed).toMatchObject({ source: 'huckleberry_csv' });
    expect('result' in parsed && parsed.result.events.length).toBe(134);
  });

  it('reads a babble export with every baby in it', () => {
    const parsed = parseImportFile(exportText([sampleBaby, sampleSibling]), 'UTC');
    expect(exportedBabies(parsed)?.map((baby) => baby.name)).toEqual([sampleBaby.name, sampleSibling.name]);
  });

  it.each([
    ['{"format":"something-else"}', 'This does not look like a babble export.'],
    ['Type,Start\n"Sleep",', 'This does not look like a Huckleberry CSV export'],
  ])('reports what is wrong with %s', (text, message) => {
    expect(parseImportFile(text, 'UTC')).toEqual({ error: message });
  });

  it('falls back to a generic message for other failures', () => {
    expect(parseImportFile(csv, 'Not/AZone')).toEqual({ error: 'That file could not be read.' });
  });
});

describe('readyImport', () => {
  it('is nothing without a usable file', () => {
    expect(readyImport(null, 0)).toBeNull();
    expect(readyImport({ error: 'nope' }, 0)).toBeNull();
  });

  it('passes a CSV straight through', () => {
    const parsed = parseImportFile(csv, 'UTC');
    expect(readyImport(parsed, 3)).toEqual({ source: 'huckleberry_csv', result: 'result' in parsed && parsed.result });
  });

  it('picks the chosen baby from an export, falling back to the first', () => {
    const parsed = parseImportFile(exportText([sampleBaby, sampleSibling]), 'UTC');
    const babies = exportedBabies(parsed)!;
    expect(readyImport(parsed, 1)).toEqual({ source: 'babble_export', result: babies[1]!.result });
    expect(readyImport(parsed, 7)).toEqual({ source: 'babble_export', result: babies[0]!.result });
  });
});

describe('import helpers', () => {
  it('rejects files over the size limit', () => {
    expect(importTooBig(MAX_IMPORT_BYTES)).toBe(false);
    expect(importTooBig(MAX_IMPORT_BYTES + 1)).toBe(true);
  });

  it('knows when babies come from more than one family', () => {
    expect(spansFamilies([{ familyId: 'a' }, { familyId: 'a' }])).toBe(false);
    expect(spansFamilies([{ familyId: 'a' }, { familyId: 'b' }])).toBe(true);
    expect(spansFamilies([])).toBe(false);
  });

  it('measures progress without dividing by zero', () => {
    expect(importProgressPercent(0, 0)).toBe(0);
    expect(importProgressPercent(3, 4)).toBe(75);
  });
});
