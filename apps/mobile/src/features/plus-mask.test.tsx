import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PlusMask } from './plus-mask';

describe('PlusMask', () => {
  it('explains the lock over the content and offers to subscribe', async () => {
    await render(
      <PlusMask feature="insights" title="All-time stats" body="Every day since birth is part of Plus.">
        <Text>Hidden chart</Text>
      </PlusMask>,
    );
    expect(screen.getByText('All-time stats')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'See what Plus adds' }));
    expect(screen.getByRole('button', { name: 'Subscribe to Plus' })).toBeTruthy();
  });

  it('shows the content as is when unlocked', async () => {
    await render(
      <PlusMask locked={false} feature="insights" title="All-time stats" body="">
        <Text>Visible chart</Text>
      </PlusMask>,
    );
    expect(screen.getByText('Visible chart')).toBeTruthy();
    expect(screen.queryByText('All-time stats')).toBeNull();
  });
});
