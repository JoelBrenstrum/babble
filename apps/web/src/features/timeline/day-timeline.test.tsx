import { sampleBaby, sampleRunningSleep } from '@babble/api/fixtures';
import { dayLayout, dayWindow, fractionOf } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { DayTimeline } from './day-timeline';

const timeZone = sampleBaby.timezone;
const now = new Date('2026-10-13T00:30:00Z');
const window = dayWindow('2026-10-13', timeZone, 0);

function renderTimeline(at: Date, shownAt: Date = at) {
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
});
