import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import { planHomeAssistantAction } from './actions';

const NOW = new Date('2026-10-06T12:00:00Z');

const nap = makeEvent('sleep', { id: 'nap', startedAt: '2026-10-06T11:00:00Z', endedAt: null });
const feed = makeEvent('breast_feed', {
  id: 'feed',
  startedAt: '2026-10-06T11:50:00Z',
  endedAt: null,
  segments: [{ side: 'left', startedAt: '2026-10-06T11:50:00Z', endedAt: null }],
});

const plan = (name: string, body: unknown = {}, events = [nap, feed]) =>
  planHomeAssistantAction(name, body, events, NOW);

describe('planHomeAssistantAction sessions', () => {
  it('starts a sleep now or at the given time', () => {
    expect(plan('start_sleep')).toEqual({ ok: true, step: { kind: 'start', type: 'sleep', side: 'left' } });
    expect(plan('start_sleep', { started_at: '2026-10-06T11:45:00+00:00' })).toMatchObject({
      step: { startAt: '2026-10-06T11:45:00.000Z' },
    });
  });

  it('acts on the running sleep', () => {
    expect(plan('pause_sleep')).toEqual({
      ok: true,
      step: { kind: 'session', eventId: 'nap', action: { kind: 'pause' } },
    });
    expect(plan('end_sleep', { ended_at: '2026-10-06T11:55:00Z' })).toMatchObject({
      step: { eventId: 'nap', action: { kind: 'end', at: '2026-10-06T11:55:00.000Z' } },
    });
    expect(plan('cancel_sleep')).toEqual({ ok: true, step: { kind: 'delete', eventId: 'nap' } });
  });

  it('refuses when nothing is running', () => {
    expect(plan('end_sleep', {}, [])).toEqual({ ok: false, status: 409, error: 'No sleep is running.' });
    expect(plan('pause_nursing', {}, [])).toEqual({ ok: false, status: 409, error: 'No feed is running.' });
  });

  it('switches to the other side of the running feed', () => {
    expect(plan('switch_nursing_side')).toMatchObject({
      step: { eventId: 'feed', action: { kind: 'switch', side: 'right' } },
    });
  });

  it('starts nursing on the chosen side', () => {
    expect(plan('start_nursing', { side: 'right' })).toMatchObject({ step: { type: 'breast_feed', side: 'right' } });
    expect(plan('start_nursing', { side: 'middle' })).toEqual({
      ok: false,
      status: 400,
      error: 'side must be one of left, right.',
    });
  });

  it('rejects unknown actions', () => {
    expect(plan('log_potty')).toMatchObject({ ok: false, status: 404 });
  });
});

describe('planHomeAssistantAction logs', () => {
  it('logs a bottle', () => {
    const result = plan('log_bottle', { amount_ml: 120, content: 'formula', left_over_ml: '10' });
    expect(result).toMatchObject({
      ok: true,
      step: {
        kind: 'save',
        draft: {
          type: 'bottle',
          startedAt: NOW.toISOString(),
          details: { content: 'formula', amountMl: 120, amountLeftMl: 10 },
        },
      },
    });
  });

  it('logs a dry nappy when neither wet nor dirty', () => {
    expect(plan('log_nappy')).toMatchObject({
      step: { draft: { type: 'nappy', details: { wet: false, dirty: false, pooColours: [] } } },
    });
  });

  it('accepts lists as arrays or comma-separated text', () => {
    expect(plan('log_nappy', { dirty: true, colours: 'yellow, green', textures: ['seedy'] })).toMatchObject({
      step: { draft: { details: { pooColours: ['yellow', 'green'], pooTextures: ['seedy'] } } },
    });
    expect(plan('log_solids', { foods: 'banana, oats' })).toMatchObject({
      step: { draft: { details: { foods: ['banana', 'oats'] } } },
    });
  });

  it('applies the same checks as the app', () => {
    expect(plan('log_nappy', { wet: true, colours: ['yellow'] })).toEqual({
      ok: false,
      status: 400,
      error: 'Poo details need a dirty nappy.',
    });
    expect(plan('log_solids')).toMatchObject({ ok: false, status: 400 });
    expect(plan('log_growth')).toMatchObject({ ok: false, status: 400 });
    expect(plan('log_bottle', { amount_ml: 100, started_at: '2026-10-07T12:00:00Z' })).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it('logs a pump ending now that lasted the given minutes', () => {
    expect(plan('log_pump', { left_ml: 60, right_ml: 40, duration_min: 15 })).toMatchObject({
      step: {
        draft: {
          type: 'pump',
          startedAt: '2026-10-06T11:45:00.000Z',
          endedAt: NOW.toISOString(),
          details: { leftMl: 60, rightMl: 40, totalMl: null },
        },
      },
    });
  });

  it('ends a pump at the given time', () => {
    expect(plan('log_pump', { total_ml: 80, duration_min: 10, ended_at: '2026-10-06T11:00:00Z' })).toMatchObject({
      step: { draft: { startedAt: '2026-10-06T10:50:00.000Z', endedAt: '2026-10-06T11:00:00.000Z' } },
    });
  });

  it('converts growth to the stored units', () => {
    expect(plan('log_growth', { weight_kg: 4.25, length_cm: 54.5 })).toMatchObject({
      step: { draft: { details: { weightG: 4250, lengthMm: 545, headCircumferenceMm: null } } },
    });
  });

  it('rejects malformed values', () => {
    expect(plan('log_bottle', { amount_ml: 'lots' })).toEqual({
      ok: false,
      status: 400,
      error: 'amount_ml must be a number.',
    });
    expect(plan('log_bottle', { amount_ml: 10, started_at: 'yesterday' })).toMatchObject({ status: 400 });
  });
});
