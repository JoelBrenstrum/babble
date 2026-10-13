import { describe, expect, it } from 'vitest';
import { describeEvent, summariseLatest } from './describe';
import { makeEvent } from './test-events';

const NOW = new Date('2026-10-06T12:00:00Z');

describe('describeEvent branches', () => {
  it('describes a custom entry with its description and length', () => {
    const event = makeEvent('custom', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:30:00Z',
      details: { title: 'Bath', description: 'Warm' },
    });
    expect(describeEvent(event, NOW, 'metric')).toEqual({
      title: 'Bath',
      parts: [{ text: 'Warm', tone: 'custom' }],
      duration: '30m',
      trailing: '30m',
      running: false,
    });
  });

  it('leaves out the length of a custom entry shorter than a minute', () => {
    const event = makeEvent('custom', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:00:30Z',
      details: { title: 'Vitamin D', description: '' },
    });
    expect(describeEvent(event, NOW, 'metric')).toMatchObject({ parts: [], duration: null });
  });

  it('describes growth in the chosen units, skipping missing measurements', () => {
    const event = makeEvent('growth', { details: { weightG: 3950, lengthMm: 510, headCircumferenceMm: 350 } });
    expect(describeEvent(event, NOW, 'imperial').parts.map((part) => part.text)).toEqual([
      '8 lb 11 oz',
      '20.1 in',
      'Head 13.8 in',
    ]);
    const weightOnly = makeEvent('growth', { details: { weightG: 3950, lengthMm: null, headCircumferenceMm: null } });
    expect(describeEvent(weightOnly, NOW, 'metric').parts.map((part) => part.text)).toEqual(['3.95 kg']);
  });

  it('shows a running bottle as in progress', () => {
    const event = makeEvent('bottle', {
      startedAt: '2026-10-06T11:00:00Z',
      endedAt: null,
      details: { content: 'formula', amountMl: null, amountLeftMl: null },
    });
    const description = describeEvent(event, NOW, 'metric');
    expect(description.running).toBe(true);
    expect(description.parts.map((part) => part.text)).toEqual(['In progress', 'formula']);
    expect(description.duration).toBe('1h 00m');
  });

  it('describes a pump without segments from its amounts', () => {
    const event = makeEvent('pump', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:20:00Z',
      segments: [],
      details: { leftMl: 60, rightMl: null, totalMl: null },
    });
    expect(describeEvent(event, NOW, 'metric')).toMatchObject({
      parts: [{ text: 'L 60 ml', tone: 'pump' }],
      duration: '20m',
      trailing: '60 ml',
    });
  });

  it('describes a sleep with no wake-ups as just its length', () => {
    const event = makeEvent('sleep', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T11:00:00Z',
      segments: [],
    });
    expect(describeEvent(event, NOW, 'metric')).toMatchObject({ parts: [], duration: '1h 00m' });
  });
});

describe('summariseLatest branches', () => {
  it('uses the title and length for a custom entry and the measurements for growth', () => {
    const custom = makeEvent('custom', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:30:00Z',
      details: { title: 'Bath', description: 'Warm' },
    });
    expect(summariseLatest(custom, NOW, 'metric')).toBe('Bath · 30m');
    const growth = makeEvent('growth', { details: { weightG: 3950, lengthMm: 510, headCircumferenceMm: null } });
    expect(summariseLatest(growth, NOW, 'metric')).toBe('3.95 kg · 51 cm');
  });

  it('uses only the title for a short custom entry', () => {
    const vitamin = makeEvent('custom', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:00:30Z',
      details: { title: 'Vitamin D', description: '' },
    });
    expect(summariseLatest(vitamin, NOW, 'metric')).toBe('Vitamin D');
  });

  it('shows the amount of a pump and the length of a sleep', () => {
    const pump = makeEvent('pump', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:20:00Z',
      segments: [],
      details: { leftMl: 60, rightMl: null, totalMl: null },
    });
    expect(summariseLatest(pump, NOW, 'metric')).toBe('60 ml');
    const sleep = makeEvent('sleep', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T11:00:00Z',
      segments: [],
    });
    expect(summariseLatest(sleep, NOW, 'metric')).toBe('1h 00m');
  });
});
