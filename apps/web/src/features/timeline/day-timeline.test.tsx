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
    expect(await screen.findByText('Nappy')).toBeInTheDocument();
    expect(screen.getByText('Pump')).toBeInTheDocument();
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

  it('draws minor hours as unlabelled lines', async () => {
    const nap = { ...sampleRunningSleep(now), startedAt: new Date(now.getTime() - 72 * 60_000).toISOString() };
    render(
      <FixtureRouter>
        <DayTimeline
          layout={dayLayout([nap], window, now)}
          ticks={[
            { frac: 0, label: '00' },
            { frac: 1 / 24, label: '01', minor: true },
            { frac: 2 / 24, label: '02', minor: true },
            { frac: 3 / 24, label: '03' },
          ]}
          timeZone={timeZone}
          units="metric"
          now={now}
          nowFrac={null}
        />
      </FixtureRouter>,
    );
    expect(await screen.findByText('03')).toBeInTheDocument();
    expect(screen.queryByText('01')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('hour-line')).toHaveLength(2);
  });

  it('explains a predicted block and shades its likely range', async () => {
    const nap = { ...sampleRunningSleep(now), startedAt: new Date(now.getTime() - 72 * 60_000).toISOString() };
    const tip = {
      title: 'Likely sleep',
      lines: ['2:10 pm – 3:20 pm · 1h 10m', 'Could start 2:00 pm – 2:30 pm', 'Estimated from recent days'],
    };
    render(
      <FixtureRouter>
        <DayTimeline
          layout={dayLayout([nap], window, now)}
          ticks={[]}
          timeZone={timeZone}
          units="metric"
          now={now}
          nowFrac={null}
          predicted={{
            sleep: [
              {
                kind: 'sleep',
                startFrac: 0.55,
                endFrac: 0.6,
                opacity: 0.8,
                label: 'Likely asleep 2:10 pm–3:20 pm',
                tip,
              },
            ],
            feeds: [],
          }}
        />
      </FixtureRouter>,
    );
    const block = await screen.findByRole('button', { name: 'Likely asleep 2:10 pm–3:20 pm' });
    fireEvent.mouseEnter(block);
    expect(screen.getByText('Could start 2:00 pm – 2:30 pm')).toBeInTheDocument();
    fireEvent.mouseLeave(block);
    expect(screen.queryByText('Could start 2:00 pm – 2:30 pm')).not.toBeInTheDocument();
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
