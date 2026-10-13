import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeeklySummaryCard } from './weekly-summary';

describe('WeeklySummaryCard', () => {
  it('shows the takeaway and each figure with its change', () => {
    render(
      <WeeklySummaryCard
        summary={{
          takeaway: 'The longest night stretch is up 40m on last week.',
          rows: [
            { label: 'Longest night stretch', value: '5h 10m', change: '+40m', trend: 'up' },
            { label: 'Feeds a day', value: '8', change: null, trend: null },
          ],
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'This week' })).toBeInTheDocument();
    expect(screen.getByText('The longest night stretch is up 40m on last week.')).toBeInTheDocument();
    expect(screen.getByText('+40m')).toBeInTheDocument();
    expect(screen.getByText('Feeds a day').nextElementSibling).toHaveTextContent('8');
  });
});
