import { timelineState } from './params';

describe('timelineState', () => {
  it('defaults to today in the day view with every lane', () => {
    expect(timelineState({})).toEqual({ view: 'day', date: null, show: undefined });
  });

  it('reads a valid view, date and lane list', () => {
    expect(timelineState({ view: '7d', date: '2026-10-06', show: 'feeds' })).toEqual({
      view: '7d',
      date: '2026-10-06',
      show: 'feeds',
    });
  });

  it('ignores values it does not recognise', () => {
    expect(timelineState({ view: 'year', date: 'yesterday', show: 'everything' })).toEqual({
      view: 'day',
      date: null,
      show: undefined,
    });
  });
});
