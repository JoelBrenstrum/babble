import { fireEvent, render, screen } from '@testing-library/react-native';
import { NapBreakdown } from './nap-breakdown';

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 6, 9, minutes)).toISOString();

describe('NapBreakdown', () => {
  it('trims only the latest wake-up on a live nap', async () => {
    const onTrimAwake = jest.fn();
    await render(
      <NapBreakdown
        nap={{
          startedAt: at(0),
          endedAt: null,
          segments: [
            { startedAt: at(0), endedAt: at(30) },
            { startedAt: at(35), endedAt: at(60) },
            { startedAt: at(70), endedAt: null },
          ],
        }}
        now={new Date(at(90))}
        onTrimAwake={onTrimAwake}
      />,
    );
    expect(screen.getAllByText('Awake')).toHaveLength(2);
    expect(screen.getByText('awake 15m 00s')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Take a minute off wake-up 1' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Take a minute off wake-up 2' }));
    expect(onTrimAwake).toHaveBeenCalledWith(1);
  });
});
