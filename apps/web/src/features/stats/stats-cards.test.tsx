import type { StatsCard } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatsCards } from './stats-cards';

const card: StatsCard = {
  key: 'feeds',
  title: 'Feeds',
  figures: [{ label: 'Per day', value: '8.5' }],
  chart: {
    unit: '',
    series: ['Bottle', 'Breast'],
    legend: [1, 0],
    bars: [
      { label: '2026-10-06', values: [1, 8] },
      { label: '2026-10-07', values: [0, 9] },
    ],
    max: 9,
    weekly: false,
  },
};

describe('StatsCards', () => {
  it('labels each bar and shows a readout for the hovered or focused one', () => {
    render(<StatsCards cards={[card]} />);
    const chart = screen.getByRole('group', { name: 'Feeds per day' });
    const first = screen.getByRole('img', { name: '6 Oct: Breast 8, Bottle 1 · Total 9' });
    const last = screen.getByRole('img', { name: '7 Oct: Breast 9, Bottle 0 · Total 9' });
    expect(chart).toContainElement(first);
    expect(screen.queryByText('6 Oct: Breast 8, Bottle 1 · Total 9')).not.toBeInTheDocument();

    fireEvent.mouseEnter(first);
    expect(screen.getByText('6 Oct: Breast 8, Bottle 1 · Total 9')).toBeInTheDocument();
    expect(first).toHaveClass('opacity-80');
    fireEvent.mouseLeave(first);
    expect(screen.queryByText('6 Oct: Breast 8, Bottle 1 · Total 9')).not.toBeInTheDocument();

    expect(last).toHaveAttribute('tabindex', '0');
    fireEvent.focus(last);
    expect(screen.getByText('7 Oct: Breast 9, Bottle 0 · Total 9')).toBeInTheDocument();
    fireEvent.keyDown(last, { key: 'ArrowLeft' });
    expect(first).toHaveFocus();
    expect(screen.getByText('6 Oct: Breast 8, Bottle 1 · Total 9')).toBeInTheDocument();
  });

  it('shows the breastfeed trend as left, right and idle minutes with its note', () => {
    render(
      <StatsCards
        cards={[
          {
            key: 'feed-trend',
            title: 'Breastfeeds',
            note: 'Each bar is the average feed over the 7 days up to that day.',
            plus: true,
            figures: [{ label: 'Per feed', value: '24m' }],
            chart: {
              unit: 'min',
              series: ['Left', 'Right', 'Idle'],
              legend: [0, 1, 2],
              bars: [{ label: '2026-10-14', values: [12, 10, 2] }],
              max: 24,
              weekly: false,
            },
          },
        ]}
        plusBadges
      />,
    );
    expect(screen.getByRole('group', { name: 'Breastfeeds per feed, 7-day average by day' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: '14 Oct: Left 12 min, Right 10 min, Idle 2 min · Total 24 min' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Each bar is the average feed over the 7 days up to that day.')).toBeInTheDocument();
    expect(screen.getByText('Plus')).toBeInTheDocument();
  });

  it('shows feed spacing as the typical daytime gap in hours', () => {
    render(
      <StatsCards
        cards={[
          {
            key: 'feed-spacing',
            title: 'Feed spacing',
            plus: true,
            figures: [
              { label: 'Daytime', value: '3h 15m' },
              { label: 'Overnight', value: '4h 30m' },
            ],
            chart: {
              unit: 'h',
              series: ['Typical daytime gap'],
              legend: [0],
              bars: [{ label: '2026-10-14', values: [3.5] }],
              max: 3.5,
              weekly: false,
            },
          },
        ]}
      />,
    );
    expect(screen.getByRole('group', { name: 'Feed spacing typical daytime gap by day' })).toBeInTheDocument();
    expect(screen.getByText('Overnight')).toBeInTheDocument();
    expect(screen.getByText('4h 30m')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '14 Oct: 3.5h' })).toBeInTheDocument();
  });
});
