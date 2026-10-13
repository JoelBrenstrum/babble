import { sampleRunningSleep } from '@babble/api/fixtures';
import { dayLayout, dayWindow, lastDays } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { MonthTimeline } from './month-timeline';

describe('MonthTimeline', () => {
  it('draws one row per day linking to that day, with its sleep', async () => {
    const keys = lastDays('2026-10-13', 30);
    const now = new Date('2026-10-13T12:00:00Z');
    const nap = { ...sampleRunningSleep(now), startedAt: '2026-10-12T10:00:00Z', endedAt: '2026-10-12T11:00:00Z' };
    const days = keys.map((dayKey) => ({
      dayKey,
      layout: dayLayout(dayKey === '2026-10-12' ? [nap] : [], dayWindow(dayKey, 'UTC', 0), now),
    }));
    const { container } = render(
      <FixtureRouter>
        <MonthTimeline
          days={days}
          ticks={[
            { frac: 0, label: '00' },
            { frac: 1, label: '24' },
          ]}
          todayKey="2026-10-13"
        />
      </FixtureRouter>,
    );
    expect(await screen.findAllByRole('link')).toHaveLength(30);
    expect(screen.getByRole('link', { name: 'Open Mon 12' })).toHaveAttribute(
      'href',
      '/timeline?view=day&date=2026-10-12',
    );
    expect(container.querySelectorAll('.bg-sleep:not(.size-2\\.5)')).toHaveLength(1);
  });
});
