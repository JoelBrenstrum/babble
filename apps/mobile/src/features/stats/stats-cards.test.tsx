import { sampleBaby, sampleEvents } from '@babble/api/fixtures';
import { dayKeyFor, lastDays, statsReport } from '@babble/domain';
import { render, screen } from '@testing-library/react-native';
import { StatsCards } from './stats-cards';

describe('StatsCards', () => {
  it('shows a card per tracker with its figures and chart', async () => {
    const now = new Date();
    const todayKey = dayKeyFor(now.toISOString(), sampleBaby.timezone, 0);
    const report = statsReport(sampleEvents(now), lastDays(todayKey, 7), todayKey, now, {
      timeZone: sampleBaby.timezone,
      dayStartMinutes: 0,
      nightStartMinutes: 19 * 60,
      nightEndMinutes: 7 * 60,
      mergeGapMs: 15_000,
      units: 'metric',
    });
    await render(<StatsCards cards={report.cards} />);
    expect(screen.getByRole('header', { name: 'Sleep' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Feeds' })).toBeTruthy();
    expect(screen.getByText('Wake window')).toBeTruthy();
    expect(screen.getByLabelText('Nappies per day')).toBeTruthy();
  });
});
