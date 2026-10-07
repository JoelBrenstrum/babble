import { render, screen } from '@testing-library/react-native';
import { SummaryStrip } from './totals';

describe('SummaryStrip', () => {
  it('shows each figure with its note', async () => {
    await render(
      <SummaryStrip
        items={[
          { label: 'Last change', value: '1h 20m', note: 'ago · 10:40 am' },
          { label: 'Wet today', value: '4', note: 'avg 5' },
          { label: 'Dirty today', value: '2', swatch: 'mustard' },
        ]}
      />,
    );
    expect(screen.getByText('1h 20m')).toBeTruthy();
    expect(screen.getByText('ago · 10:40 am')).toBeTruthy();
    expect(screen.getByText('avg 5')).toBeTruthy();
    expect(screen.getByText('Dirty today')).toBeTruthy();
  });
});
