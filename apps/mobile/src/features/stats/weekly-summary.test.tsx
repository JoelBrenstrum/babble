import { render, screen } from '@testing-library/react-native';
import { WeeklySummaryCard } from './weekly-summary';

describe('WeeklySummaryCard', () => {
  it('shows the takeaway and each figure with its change', async () => {
    await render(
      <WeeklySummaryCard
        summary={{
          takeaway: 'The longest night stretch is up 40m on last week.',
          rows: [{ label: 'Longest night stretch', value: '5h 10m', change: '+40m', trend: 'up' }],
        }}
      />,
    );
    expect(screen.getByText('The longest night stretch is up 40m on last week.')).toBeTruthy();
    expect(screen.getByText('5h 10m')).toBeTruthy();
    expect(screen.getByText('+40m')).toBeTruthy();
  });
});
