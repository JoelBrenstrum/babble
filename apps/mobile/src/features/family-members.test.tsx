import type { BabbleClient, Family } from '@babble/api';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { FamilyMembers } from './family-members';

const mockRename = jest.fn(async (..._args: unknown[]) => undefined);
const mockRemove = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('@babble/api', () => ({
  ...jest.requireActual('@babble/api'),
  renameMember: (...args: unknown[]) => mockRename(...args),
  removeMember: (...args: unknown[]) => mockRemove(...args),
}));

const family: Family = {
  id: 'family-1',
  name: 'The Smiths',
  plan: 'free',
  created_at: '',
  babies: [],
  members: [
    { family_id: 'family-1', user_id: 'john', role: 'owner', display_name: 'John', created_at: '1' },
    { family_id: 'family-1', user_id: 'jane', role: 'caregiver', display_name: 'Jane', created_at: '2' },
  ],
};
const client = {} as BabbleClient;

afterEach(() => jest.clearAllMocks());

describe('FamilyMembers', () => {
  it('lets the owner rename a caregiver', async () => {
    const onChanged = jest.fn(async () => undefined);
    await render(<FamilyMembers client={client} family={family} userId="john" onChanged={onChanged} />);
    await fireEvent.press(screen.getByLabelText('Rename Jane'));
    await fireEvent.changeText(screen.getByLabelText("Jane's name"), '  ');
    await fireEvent.press(screen.getByText('Save'));
    expect(screen.getByText('Enter a name.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Jane's name"), 'Nana');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockRename).toHaveBeenCalledWith(client, { familyId: 'family-1', userId: 'jane' }, 'Nana');
    expect(onChanged).toHaveBeenCalled();
  });

  it('asks before the owner removes a caregiver', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onChanged = jest.fn(async () => undefined);
    await render(<FamilyMembers client={client} family={family} userId="john" onChanged={onChanged} />);
    expect(screen.queryByLabelText('Remove John')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Remove Jane'));
    const [title, , buttons] = alert.mock.calls[0]!;
    expect(title).toBe('Remove Jane?');
    await buttons!.find((button) => button.text === 'Remove')!.onPress!();
    expect(mockRemove).toHaveBeenCalledWith(client, { familyId: 'family-1', userId: 'jane' });
  });

  it('lets a caregiver rename only themselves', async () => {
    await render(<FamilyMembers client={client} family={family} userId="jane" onChanged={jest.fn()} />);
    expect(screen.getByLabelText('Rename Jane')).toBeTruthy();
    expect(screen.queryByLabelText('Rename John')).toBeNull();
    expect(screen.queryByLabelText(/^Remove/)).toBeNull();
  });
});
