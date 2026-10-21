import { fromPickerDate, toPickerDate } from './datetime-field';

describe('picker dates', () => {
  it('round-trips an instant through the zoned wall-clock picker value', () => {
    const iso = '2026-10-05T01:30:00.000Z';
    const picked = toPickerDate(iso, 'Pacific/Auckland');
    expect([picked.getHours(), picked.getMinutes()]).toEqual([14, 30]);
    expect(fromPickerDate(picked, 'Pacific/Auckland')).toBe(iso);
  });
});
