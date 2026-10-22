import { sampleBaby, sampleEvents } from '@babble/api/fixtures';
import { dayComparison, timelineModel, type TimelineView } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { DayPanel, dayPanelView, isDayModel } from './day-panel';

const now = new Date('2026-10-13T03:00:00Z');
const events = sampleEvents(now);
const settings = { night_start_minutes: 19 * 60, night_end_minutes: 7 * 60, downtime_merge_threshold_sec: 600 };
const model = (view: TimelineView) => timelineModel({ view, date: undefined, events, settings, baby: sampleBaby, now });

describe('dayPanelView', () => {
  it('reads the day view from its bucketed day', () => {
    const day = model('day');
    if (!isDayModel(day) || day.view !== 'day') throw new Error('expected a day model');
    expect(dayPanelView(day)).toEqual({
      summary: day.day.summary,
      layout: day.day.layout,
      ticks: day.ticks,
      nowFrac: day.nowFrac,
    });
  });

  it('reads the rolling view from the model itself', () => {
    const rolling = model('24h');
    if (!isDayModel(rolling) || rolling.view !== '24h') throw new Error('expected a 24h model');
    expect(dayPanelView(rolling)).toEqual({
      summary: rolling.summary,
      layout: rolling.layout,
      ticks: rolling.ticks,
      nowFrac: 1,
    });
  });

  it('only treats day and 24h models as day panels', () => {
    expect(isDayModel(model('day'))).toBe(true);
    expect(isDayModel(model('24h'))).toBe(true);
    expect(isDayModel(model('7d'))).toBe(false);
    expect(isDayModel(model('30d'))).toBe(false);
  });
});

describe('DayPanel', () => {
  const day = model('day');
  if (!isDayModel(day)) throw new Error('expected a day model');
  const view = dayPanelView(day);
  const common = {
    view,
    markers: { feedDue: null, night: [] },
    lanes: ['sleep', 'feeds', 'nappies', 'pumps'] as const,
    now,
    units: 'metric' as const,
    timeZone: sampleBaby.timezone,
  };

  it('shows totals and the summary strip on its own', async () => {
    render(
      <FixtureRouter>
        <DayPanel {...common} before={<p>Before</p>} after={<p>After</p>} />
      </FixtureRouter>,
    );
    expect(await screen.findByTestId('day-timeline')).toBeInTheDocument();
    expect(screen.queryByTestId('day-comparison-timelines')).not.toBeInTheDocument();
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
  });

  it('adds the day rhythm cards after the totals', async () => {
    const rhythm = [
      {
        key: 'spacing' as const,
        label: 'Feed spacing',
        value: '2h 45m',
        details: [
          { label: 'Longest', value: '4h 00m' },
          { label: 'Shortest', value: '2h 30m' },
        ],
      },
    ];
    render(
      <FixtureRouter>
        <DayPanel {...common} rhythm={rhythm} />
      </FixtureRouter>,
    );
    expect(await screen.findByText('Feed spacing')).toBeInTheDocument();
    expect(screen.getByText('2h 45m')).toBeInTheDocument();
    expect(screen.getByText('Shortest')).toBeInTheDocument();
  });

  it('shows a spinner while the comparison loads', async () => {
    render(
      <FixtureRouter>
        <DayPanel {...common} currentLabel="Today" comparison="loading" />
      </FixtureRouter>,
    );
    expect(await screen.findByTestId('day-comparison-timelines')).toBeInTheDocument();
    expect(screen.getByText('…')).toBeInTheDocument();
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('draws both days side by side with the comparison card', async () => {
    const comparison = dayComparison({
      dayKey: day.dayKey,
      todayKey: day.todayKey,
      current: view.summary,
      events,
      settings,
      baby: sampleBaby,
      now,
    });
    render(
      <FixtureRouter>
        <DayPanel {...common} currentLabel="Today" comparison={comparison} plusBadge />
      </FixtureRouter>,
    );
    expect(await screen.findAllByTestId('day-timeline')).toHaveLength(2);
    expect(screen.getAllByText(comparison.previousLabel).length).toBeGreaterThan(0);
    expect(screen.getByText(comparison.title)).toBeInTheDocument();
  });
});
