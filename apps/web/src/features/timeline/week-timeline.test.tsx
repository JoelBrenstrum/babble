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
});
