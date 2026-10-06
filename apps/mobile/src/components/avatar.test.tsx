import { render, screen } from '@testing-library/react-native';
import { Avatar, initials } from './avatar';

describe('initials', () => {
  it.each([
    ['John', 'Jo'],
    ['Jane Smith', 'JS'],
    ['  mary   anne smith ', 'MS'],
    ['', '?'],
  ])('%j → %j', (name, expected) => expect(initials(name)).toBe(expected));
});

describe('Avatar', () => {
  it('shows initials and labels the full name', async () => {
    await render(<Avatar name="Jane Smith" />);
    expect(screen.getByText('JS')).toBeTruthy();
    expect(screen.getByLabelText('Jane Smith')).toBeTruthy();
  });
});
