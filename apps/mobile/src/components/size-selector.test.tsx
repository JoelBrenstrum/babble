import { fireEvent, render, screen } from '@testing-library/react-native';
import { SizeSelector } from './size-selector';

describe('SizeSelector', () => {
  it('offers every size by its label and toggles the pressed one', async () => {
    const onChange = jest.fn();
    await render(<SizeSelector label="Wee size" value="little" onChange={onChange} />);
    for (const name of ['Tiny', 'Little', 'Medium', 'Large', 'Massive']) {
      expect(screen.getByRole('radio', { name })).toBeTruthy();
    }
    expect(screen.getByRole('radio', { name: 'Little' }).props.accessibilityState.checked).toBe(true);
    await fireEvent.press(screen.getByRole('radio', { name: 'Little' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    await fireEvent.press(screen.getByRole('radio', { name: 'Massive' }));
    expect(onChange).toHaveBeenLastCalledWith('massive');
  });
});
