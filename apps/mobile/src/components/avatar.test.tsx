import { render, screen } from '@testing-library/react-native';
import { memberTones } from '@babble/domain';
import { Avatar, initials, MemberTonesProvider } from './avatar';

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

  it('colours each family member differently', async () => {
    const tones = memberTones([
      { display_name: 'John', created_at: '2026-01-01T00:00:00Z', user_id: 'john' },
      { display_name: 'Jane', created_at: '2026-02-01T00:00:00Z', user_id: 'jane' },
    ]);
    await render(
      <MemberTonesProvider value={tones}>
        <Avatar name="John" />
        <Avatar name="Jane" />
      </MemberTonesProvider>,
    );
    expect(screen.getByTestId('avatar-person-1')).toHaveProp('accessibilityLabel', 'John');
    expect(screen.getByTestId('avatar-person-2')).toHaveProp('accessibilityLabel', 'Jane');
  });
});
