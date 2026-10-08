import { describe, expect, it } from 'vitest';
import { makeEvent } from '../events/test-events';
import { growthPlaceholders, toGrowthInput } from './previous';

const measured = (id: string, startedAt: string, details: Partial<ReturnType<typeof makeEvent<'growth'>>['details']>) =>
  makeEvent('growth', {
    id,
    startedAt,
    endedAt: startedAt,
    details: { weightG: null, lengthMm: null, headCircumferenceMm: null, ...details },
  });

const events = [
  measured('old', '2026-09-20T01:00:00Z', { weightG: 4200, lengthMm: 540, headCircumferenceMm: 372 }),
  measured('new', '2026-10-03T01:00:00Z', { weightG: 4800 }),
  { ...measured('deleted', '2026-10-05T01:00:00Z', { weightG: 9000 }), deletedAt: '2026-10-05T02:00:00Z' },
  makeEvent('nappy', { startedAt: '2026-10-06T01:00:00Z' }),
];

describe('growthPlaceholders', () => {
  it("uses each measurement's own latest value", () => {
    expect(growthPlaceholders(events, 'metric', 'Pacific/Auckland')).toEqual({
      weightG: 'Last: 4.8 kg · 3 Oct',
      lengthMm: 'Last: 54 cm · 20 Sept',
      headCircumferenceMm: 'Last: 37.2 cm · 20 Sept',
    });
  });

  it('follows the unit setting', () => {
    expect(growthPlaceholders(events, 'imperial', 'Pacific/Auckland').weightG).toBe('Last: 10.58 lb · 3 Oct');
  });

  it('leaves out the entry being edited, and has nothing when nothing was measured', () => {
    expect(growthPlaceholders(events, 'metric', 'UTC', 'new').weightG).toBe('Last: 4.2 kg · 20 Sept');
    expect(growthPlaceholders([], 'metric', 'UTC')).toEqual({
      weightG: null,
      lengthMm: null,
      headCircumferenceMm: null,
    });
  });
});

describe('toGrowthInput', () => {
  it('converts to the number typed into the field', () => {
    expect(toGrowthInput(4800, 'weightG', 'metric')).toBe('4.8');
    expect(toGrowthInput(254, 'lengthMm', 'imperial')).toBe('10');
  });
});
