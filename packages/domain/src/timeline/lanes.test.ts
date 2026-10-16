import { describe, expect, it } from 'vitest';
import type { DayLayout, TimelineItem } from './day-layout';
import { filterLayout, parseTimelineLanes, shownLanes, statsBarLink, toggleLane } from './lanes';

describe('parseTimelineLanes', () => {
  it.each([
    ['nappies', 'nappies'],
    ['nappies,sleep', 'sleep,nappies'],
    ['sleep,nope', 'sleep'],
    ['sleep,feeds,nappies,pumps', undefined],
    ['nope', undefined],
    ['', undefined],
    [3, undefined],
  ])('%j → %j', (input, expected) => expect(parseTimelineLanes(input)).toBe(expected));
});

describe('shownLanes', () => {
  it('shows every lane when nothing is picked', () => {
    expect(shownLanes(undefined)).toEqual(['sleep', 'feeds', 'nappies', 'pumps']);
    expect(shownLanes('feeds,sleep')).toEqual(['sleep', 'feeds']);
  });
});

describe('toggleLane', () => {
  it('hides a lane from the full set', () => expect(toggleLane(undefined, 'pumps')).toBe('sleep,feeds,nappies'));
  it('adds a lane back', () => expect(toggleLane('sleep', 'nappies')).toBe('sleep,nappies'));
  it('goes back to everything once all lanes are on', () =>
    expect(toggleLane('sleep,feeds,nappies', 'pumps')).toBeUndefined());
  it('keeps the last lane on', () => expect(toggleLane('sleep', 'sleep')).toBe('sleep'));
});

describe('filterLayout', () => {
  const item = { event: { id: 'a' } } as TimelineItem;
  const layout: DayLayout = { sleep: [item], feeds: [item], nappies: [item], pumps: [item] };

  it('empties hidden lanes', () =>
    expect(filterLayout(layout, ['nappies'])).toEqual({ sleep: [], feeds: [], nappies: [item], pumps: [] }));
  it('leaves the layout alone when every lane shows', () =>
    expect(filterLayout(layout, ['sleep', 'feeds', 'nappies', 'pumps'])).toBe(layout));
});

describe('statsBarLink', () => {
  it('opens the day with the card’s lane', () => {
    expect(statsBarLink('nappies', { label: '2026-10-12', values: [3] }, false)).toEqual({
      view: 'day',
      date: '2026-10-12',
      show: 'nappies',
    });
    expect(statsBarLink('pump', { label: '2026-10-12', values: [3] }, false)?.show).toBe('pumps');
    expect(statsBarLink('night', { label: '2026-10-12', values: [3] }, false)?.show).toBe('sleep');
    expect(statsBarLink('feed-trend', { label: '2026-10-12', values: [3] }, false)?.show).toBe('feeds');
    expect(statsBarLink('feed-spacing', { label: '2026-10-12', values: [3] }, false)?.show).toBe('feeds');
  });

  it('opens the week ending on a weekly bar’s last day', () =>
    expect(statsBarLink('feeds', { label: '2026-09-01', lastDay: '2026-09-07', values: [3] }, true)).toEqual({
      view: '7d',
      date: '2026-09-07',
      show: 'feeds',
    }));

  it('does not link sample bars', () => {
    expect(statsBarLink('sleep', { label: '2026-10-12', title: 'Mon', values: [3] }, false)).toBeNull();
    expect(statsBarLink('sleep', { label: 'Mon', values: [3] }, false)).toBeNull();
  });
});
