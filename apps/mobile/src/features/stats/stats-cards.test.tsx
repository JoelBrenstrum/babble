import { sampleBaby, sampleEvents } from '@babble/api/fixtures';
import { dayKeyFor, lastDays, statsReport, type StatsCard } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
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

  it('reads out a tapped bar and clears it on a second tap', async () => {
    const card: StatsCard = {
      key: 'feeds',
      title: 'Feeds',
      figures: [],
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
    await render(<StatsCards cards={[card]} />);
    const bar = screen.getByRole('button', { name: '7 Oct: Breast 9, Bottle 0' });
    await fireEvent.press(bar);
    expect(screen.getByText('7 Oct: Breast 9, Bottle 0')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '6 Oct: Breast 8, Bottle 1' }));
    expect(screen.getByText('6 Oct: Breast 8, Bottle 1')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: '6 Oct: Breast 8, Bottle 1' }));
    expect(screen.getByText('Tap a bar to see its day')).toBeTruthy();
  });
});
