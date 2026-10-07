import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseHuckleberryCsv } from './import';
import { makeEvent } from '../events/test-events';
import { importedNote, summariseImport } from './summary';

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8');

describe('summariseImport', () => {
  it('counts events by type and finds the date range', () => {
    const summary = summariseImport(parseHuckleberryCsv(fixture('real-week.csv'), { timeZone: 'Pacific/Auckland' }));
    expect(summary).toMatchObject({
      total: 134,
      byType: { nappy: 39, breast_feed: 56, sleep: 36, growth: 3 },
      skipped: 0,
      warnings: 0,
    });
    expect(summary.firstAt! < summary.lastAt!).toBe(true);
  });

  it('reports skipped rows and warnings', () => {
    const summary = summariseImport(parseHuckleberryCsv(fixture('all-types.csv'), { timeZone: 'Pacific/Auckland' }));
    expect(summary).toMatchObject({ skipped: 5, warnings: 1 });
  });

  it('handles an empty export', () => {
    expect(summariseImport({ events: [], skipped: [], warnings: [] })).toEqual({
      total: 0,
      byType: {},
      firstAt: null,
      lastAt: null,
      skipped: 0,
      warnings: 0,
    });
  });
});

describe('importedNote', () => {
  it('explains missing sides and downtime only on imported feeds and pumps', () => {
    expect(importedNote(makeEvent('breast_feed', { source: 'huckleberry_csv' }))).toMatch(/Side order and downtime/);
    expect(importedNote(makeEvent('pump', { source: 'huckleberry_csv' }))).not.toBeNull();
    expect(importedNote(makeEvent('sleep', { source: 'huckleberry_csv' }))).toBeNull();
    expect(importedNote(makeEvent('breast_feed'))).toBeNull();
  });
});
