import { render, screen } from '@testing-library/react-native';
import { MonthTimeline } from './month-timeline';

const days = [
  { dayKey: '2026-10-12', layout: null },
  { dayKey: '2026-10-13', layout: null },
];
const ticks = [
  { frac: 0, label: '00' },
  { frac: 1, label: '24' },
];

describe('MonthTimeline', () => {
  it('marks the night start on every row and names it in the legend', async () => {
    await render(
      <MonthTimeline
        days={days}
        ticks={ticks}
        todayKey="2026-10-13"
        onOpenDay={() => undefined}
        night={[{ frac: 0.75, label: 'Night starts 6:00 pm' }]}
      />,
    );
    expect(screen.getByText('Night starts 6:00 pm')).toBeTruthy();
    expect(screen.getAllByTestId('night-marker').map((marker) => marker.props.style.left)).toEqual([
      '75.000%',
      '75.000%',
    ]);
  });

  it('leaves the night start out when there is none', async () => {
    await render(<MonthTimeline days={days} ticks={ticks} todayKey="2026-10-13" onOpenDay={() => undefined} />);
    expect(screen.queryByTestId('night-marker')).toBeNull();
  });
});
