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
});
