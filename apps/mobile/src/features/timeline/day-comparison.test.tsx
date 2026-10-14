import { dayComparison, summariseDay } from '@babble/domain';
import { render, screen } from '@testing-library/react-native';
import { DayComparisonCard } from './day-comparison';

const baby = { timezone: 'UTC', day_start_minutes: 0, birth_date: '2026-09-01' };
const now = new Date('2026-10-08T12:00:00Z');
const window = { start: new Date('2026-10-08T00:00:00Z'), end: new Date('2026-10-09T00:00:00Z') };

describe('DayComparisonCard', () => {
  it('shows the older day first, then the selected day and the change', async () => {
    const comparison = dayComparison({
      dayKey: '2026-10-08',
      todayKey: '2026-10-08',
      current: summariseDay([], window, { now }),
      events: [],
      settings: null,
      baby,
      now,
    });
    await render(<DayComparisonCard comparison={comparison} currentLabel="Today" plusBadge={false} />);
    expect(screen.getByText('By this time yesterday')).toBeOnTheScreen();
    expect(screen.getByLabelText('Nappies: Yesterday 0, Today 0, Same')).toBeOnTheScreen();
  });
});
