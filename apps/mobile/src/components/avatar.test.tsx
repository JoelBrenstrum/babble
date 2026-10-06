import { render, screen } from '@testing-library/react-native';
import { Avatar, initials } from './avatar';

describe('initials', () => {
  it.each([
    ['Joel', 'Jo'],
    ['Jaimi Brenstrum', 'JB'],
    ['  mary   anne smith ', 'MS'],
    ['', '?'],
  ])('%j → %j', (name, expected) => expect(initials(name)).toBe(expected));
});

describe('Avatar', () => {
  it('shows initials and labels the full name', async () => {
    await render(<Avatar name="Jaimi Brenstrum" />);
    expect(screen.getByText('JB')).toBeTruthy();
    expect(screen.getByLabelText('Jaimi Brenstrum')).toBeTruthy();
  });
});
