import { describe, expect, it } from 'vitest';
import { describeEvent, summariseLatest } from './describe';
import { makeEvent } from './test-events';

const NOW = new Date('2026-10-06T12:00:00Z');

describe('describeEvent branches', () => {
  it('describes alert time with its activities and what ended it', () => {
    const event = makeEvent('alert', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:45:00Z',
      details: { activities: ['tummy_time', 'reading'], endedBy: 'tired' },
    });
    expect(describeEvent(event, NOW, 'metric')).toEqual({
      title: 'Alert time',
      parts: [
        { text: 'Tummy time', tone: 'alert' },
        { text: 'Reading', tone: 'alert' },
        { text: 'Then tired', tone: 'neutral' },
      ],
      duration: '45m',
      trailing: '45m',
      running: false,
    });
    expect(summariseLatest(event, NOW, 'metric')).toBe('45m');
  });

  it('shows running alert time as in progress', () => {
    const event = makeEvent('alert', { startedAt: '2026-10-06T11:30:00Z', endedAt: null });
    expect(describeEvent(event, NOW, 'metric')).toMatchObject({
      parts: [{ text: 'In progress', tone: 'active', icon: 'play' }],
      duration: '30m',
      running: true,
    });
  });

  it('describes a custom entry with its description and length', () => {
    const event = makeEvent('custom', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:30:00Z',
      details: { title: 'Bath', description: 'Warm', kind: 'note', amount: null, unit: null },
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
      details: { title: 'Vitamin D', description: '', kind: 'note', amount: null, unit: null },
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
      details: { title: 'Bath', description: 'Warm', kind: 'note', amount: null, unit: null },
    });
    expect(summariseLatest(custom, NOW, 'metric')).toBe('Bath · 30m');
    const growth = makeEvent('growth', { details: { weightG: 3950, lengthMm: 510, headCircumferenceMm: null } });
    expect(summariseLatest(growth, NOW, 'metric')).toBe('3.95 kg · 51 cm');
  });

  it('uses only the title for a short custom entry', () => {
    const vitamin = makeEvent('custom', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:00:30Z',
      details: { title: 'Vitamin D', description: '', kind: 'note', amount: null, unit: null },
    });
    expect(summariseLatest(vitamin, NOW, 'metric')).toBe('Vitamin D');
  });

  it('includes the amount of a custom entry', () => {
    const drops = makeEvent('custom', {
      startedAt: '2026-10-06T10:00:00Z',
      endedAt: '2026-10-06T10:00:00Z',
      details: { title: 'Vitamin drops', description: '', kind: 'amount', amount: 2.5, unit: 'drops' },
    });
    expect(summariseLatest(drops, NOW, 'metric')).toBe('Vitamin drops · 2.5 drops');
    expect(describeEvent(drops, NOW, 'metric').parts.map((part) => part.text)).toEqual(['2.5 drops']);
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
