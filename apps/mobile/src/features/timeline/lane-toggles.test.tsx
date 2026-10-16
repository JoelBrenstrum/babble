import { fireEvent, render, screen } from '@testing-library/react-native';
import { LaneToggles } from './lane-toggles';

describe('LaneToggles', () => {
  it('turns a lane off and keeps the last one on', async () => {
    const onChange = jest.fn();
    await render(<LaneToggles show={undefined} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('switch', { name: 'Sleep' }));
    expect(onChange).toHaveBeenCalledWith('feeds,nappies,pumps');
  });

  it('cannot hide the only lane left', async () => {
    await render(<LaneToggles show="nappies" onChange={jest.fn()} />);
    expect(screen.getByRole('switch', { name: 'Nappies' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Feeds' })).not.toBeChecked();
  });
});
