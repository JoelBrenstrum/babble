import { babyChoices } from '@babble/api';
import { sampleBaby, sampleFamily } from '@babble/api/fixtures';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { BabyHeader } from './baby-header';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const choices = babyChoices([sampleFamily]);

describe('BabyHeader', () => {
  it('opens the switcher and selects another baby', async () => {
    const onSelect = jest.fn();
    await render(<BabyHeader family={sampleFamily} baby={sampleBaby} choices={choices} onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole('button', { name: /switch baby/i }));
    expect(screen.getByRole('radio', { name: 'Olivia' }).props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByRole('radio', { name: 'Jacob' }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ baby: expect.objectContaining({ name: 'Jacob' }) }),
    );
  });

  it('does not re-select the current baby', async () => {
    const onSelect = jest.fn();
    await render(<BabyHeader family={sampleFamily} baby={sampleBaby} choices={choices} onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole('button', { name: /switch baby/i }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Olivia' }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
