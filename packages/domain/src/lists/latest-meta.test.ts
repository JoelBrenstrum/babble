import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import { latestMeta } from './latest-meta';

const NOW = new Date('2026-10-06T12:00:00Z');
const meta = (event: Parameters<typeof latestMeta>[0]) => latestMeta(event, NOW, 'metric', 'UTC');

describe('latestMeta', () => {
  it('says so when nothing is logged', () => {
    expect(meta(undefined)).toBe('Nothing logged yet');
  });

  it('shows a running session as in progress', () => {
    const nap = makeEvent('sleep', { startedAt: '2026-10-06T11:00:00Z', endedAt: null, segments: [] });
    expect(meta(nap)).toBe('In progress · 1h 00m');
  });

  it('shows how long ago a finished entry was, with its detail', () => {
    const bottle = makeEvent('bottle', {
      startedAt: '2026-10-06T11:00:00Z',
      endedAt: '2026-10-06T11:00:00Z',
      details: { content: 'formula', amountMl: 120, amountLeftMl: 0 },
    });
    expect(meta(bottle)).toBe('Last 1h 00m ago · 120 ml formula');
  });

  it('measures a finished session from when it ended', () => {
    const nap = makeEvent('sleep', {
      startedAt: '2026-10-06T09:00:00Z',
      endedAt: '2026-10-06T11:30:00Z',
      segments: [],
    });
    expect(meta(nap)).toBe('Last 30m ago · 2h 30m');
  });

  it('shows the date for growth rather than how long ago', () => {
    const growth = makeEvent('growth', {
      startedAt: '2026-10-01T09:00:00Z',
      endedAt: '2026-10-01T09:00:00Z',
      details: { weightG: 3950, lengthMm: 510, headCircumferenceMm: null },
    });
    expect(meta(growth)).toBe('3.95 kg · 1 Oct');
  });

  it('leads a custom entry with its title', () => {
    const custom = makeEvent('custom', {
      startedAt: '2026-10-06T11:00:00Z',
      endedAt: '2026-10-06T11:00:00Z',
      details: { title: 'Vitamin D', description: '' },
    });
    expect(meta(custom)).toBe('Last 1h 00m ago · Vitamin D');
  });
});
