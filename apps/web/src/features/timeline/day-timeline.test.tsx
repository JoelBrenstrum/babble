import { sampleBaby, sampleRunningSleep } from '@babble/api/fixtures';
import { dayLayout, dayWindow, fractionOf, type TimelineLane } from '@babble/domain';
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { DayTimeline } from './day-timeline';

const timeZone = sampleBaby.timezone;
const now = new Date('2026-10-13T00:30:00Z');
const window = dayWindow('2026-10-13', timeZone, 0);

function renderTimeline(at: Date, shownAt: Date = at, lanes?: TimelineLane[]) {
  const nap = { ...sampleRunningSleep(at), startedAt: new Date(at.getTime() - 72 * 60_000).toISOString() };
  render(
    <FixtureRouter>
      <DayTimeline
        layout={dayLayout([nap], window, at)}
        ticks={[{ frac: 0, label: '12am' }]}
        timeZone={timeZone}
        units="metric"
        now={shownAt}
        nowFrac={fractionOf(window, at.getTime())}
        lanes={lanes}
      />
    </FixtureRouter>,
  );
}

describe('DayTimeline', () => {
  it('measures a running sleep against the time it is given', async () => {
    renderTimeline(now);
    expect(await screen.findByText('1h 12m')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Sleep .*running$/ })).toBeInTheDocument();
  });

  it('follows the time as it moves on', async () => {
    renderTimeline(now, new Date(now.getTime() + 30 * 60_000));
    expect(await screen.findByText('1h 42m')).toBeInTheDocument();
  });

  it('only draws the lanes it is asked to', async () => {
    renderTimeline(now, now, ['nappies', 'pumps']);
    expect(await screen.findByText('Nappies')).toBeInTheDocument();
    expect(screen.getByText('Pumps')).toBeInTheDocument();
    expect(screen.queryByText('Sleep')).not.toBeInTheDocument();
    expect(screen.queryByText('1h 12m')).not.toBeInTheDocument();
  });

  it('shows a summary when an entry is hovered', async () => {
    renderTimeline(now);
    const sleep = await screen.findByRole('link', { name: /^Sleep / });
    fireEvent.mouseEnter(sleep);
    expect(screen.getByText(/ – now · 1h 12m so far$/)).toBeInTheDocument();
    fireEvent.mouseLeave(sleep);
    expect(screen.queryByText(/so far$/)).not.toBeInTheDocument();
  });

  describe('on a phone', () => {
    afterEach(() => vi.useRealTimers());

    it('shows the summary on a long press instead of opening the entry', async () => {
      renderTimeline(now);
      const sleep = await screen.findByRole('link', { name: /^Sleep / });
      vi.useFakeTimers();
      const press = createEvent.pointerDown(sleep);
      Object.defineProperty(press, 'pointerType', { value: 'touch' });
      fireEvent(sleep, press);
      act(() => vi.advanceTimersByTime(500));
      fireEvent.pointerUp(sleep);
      expect(screen.getByText(/ – now · 1h 12m so far$/)).toBeInTheDocument();
      expect(fireEvent.click(sleep)).toBe(false);
    });
  });
});
