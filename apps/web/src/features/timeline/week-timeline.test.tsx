import { sampleRunningSleep } from '@babble/api/fixtures';
import { dayLayout, dayWindow } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { WeekTimeline } from './week-timeline';

describe('WeekTimeline', () => {
  it('describes each day to screen readers', async () => {
    const now = new Date('2026-10-13T12:00:00Z');
    const nap = { ...sampleRunningSleep(now), startedAt: '2026-10-12T10:00:00Z', endedAt: '2026-10-12T11:00:00Z' };
    render(
      <FixtureRouter>
        <WeekTimeline
          days={[
            { dayKey: '2026-10-12', layout: dayLayout([nap], dayWindow('2026-10-12', 'UTC', 0), now) },
            { dayKey: '2026-10-13', layout: null },
          ]}
          ticks={[{ frac: 0, label: '12am' }]}
          todayKey="2026-10-13"
        />
      </FixtureRouter>,
    );
    const monday = await screen.findByRole('link', { name: 'Open Mon 12' });
    expect(monday).toHaveAccessibleDescription('1 sleep');
    expect(screen.getByRole('link', { name: 'Open Tue 13' })).toHaveAccessibleDescription('No data for this day');
  });

  it('draws the hour lines and the night start across every day', async () => {
    render(
      <FixtureRouter>
        <WeekTimeline
          days={[
            { dayKey: '2026-10-12', layout: null },
            { dayKey: '2026-10-13', layout: null },
          ]}
          ticks={[
            { frac: 0, label: '00' },
            { frac: 0.25, label: '6am', minor: true },
            { frac: 0.5, label: 'noon' },
            { frac: 1, label: '24' },
          ]}
          todayKey="2026-10-13"
          night={[{ frac: 0.75, label: 'Night starts 6:00 pm' }]}
        />
      </FixtureRouter>,
    );
    expect(await screen.findByText('Night starts 6:00 pm')).toBeInTheDocument();
    const lines = screen.getAllByTestId('hour-line');
    expect(lines.map((line) => line.style.top)).toEqual(['25%', '50%', '25%', '50%']);
    expect(lines.map((line) => line.classList.contains('opacity-40'))).toEqual([true, false, true, false]);
    expect(screen.getByText('noon')).toBeInTheDocument();
    expect(screen.queryByText('6am')).toBeNull();
    const markers = screen.getAllByTestId('night-marker');
    expect(markers.map((marker) => marker.style.top)).toEqual(['75%', '75%']);
    expect(markers[0]).toHaveClass('border-dashed');
  });
});
