import { dayComparison, dayLayout, summariseDay } from '@babble/domain';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { DayPanel } from './day-panel';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const baby = { timezone: 'UTC', day_start_minutes: 0, birth_date: '2026-09-01' };
const now = new Date('2026-10-08T12:00:00Z');
const window = { start: new Date('2026-10-08T00:00:00Z'), end: new Date('2026-10-09T00:00:00Z') };
const summary = summariseDay([], window, { now });
const layout = dayLayout([], window, now);

function renderPanel(props: Partial<Parameters<typeof DayPanel>[0]> = {}) {
  return render(
    <DayPanel
      summary={summary}
      layout={layout}
      lanes={['sleep', 'feeds', 'nappies', 'pumps']}
      ticks={[]}
      nowFrac={0.5}
      now={now}
      units="metric"
      timeZone="UTC"
      night={[]}
      currentLabel="Today"
      {...props}
    />,
  );
}

describe('DayPanel', () => {
  it('shows the summary, timeline and totals with anything slotted around them', async () => {
    await renderPanel({ before: <Text>Before</Text>, after: <Text>After</Text> });
    expect(screen.getAllByText('Sleep').length).toBeGreaterThan(0);
    expect(screen.getByText('Before')).toBeOnTheScreen();
    expect(screen.getByText('After')).toBeOnTheScreen();
    expect(screen.queryByTestId('day-comparison-timelines')).toBeNull();
  });

  it('shows a spinner beside the current day while the comparison loads', async () => {
    await renderPanel({ comparison: 'loading' });
    expect(screen.getByTestId('day-comparison-timelines')).toBeOnTheScreen();
    expect(screen.getByLabelText('Loading')).toBeOnTheScreen();
    expect(screen.getByText('…')).toBeOnTheScreen();
    expect(screen.getByText('Today')).toBeOnTheScreen();
  });

  it('shows the compared day and its card instead of the totals', async () => {
    const comparison = dayComparison({
      dayKey: '2026-10-08',
      todayKey: '2026-10-08',
      current: summary,
      events: [],
      settings: null,
      baby,
      now,
    });
    await renderPanel({ comparison });
    expect(screen.getByTestId('day-comparison-timelines')).toBeOnTheScreen();
    expect(screen.getByText('By this time yesterday')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Loading')).toBeNull();
  });
});
