import type { BabbleClient, Family } from '@babble/api';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FamilyMembers } from './family-members';

const api = vi.hoisted(() => ({
  renameMember: vi.fn(async () => undefined),
  removeMember: vi.fn(async () => undefined),
  setMemberRole: vi.fn(async () => undefined),
}));
vi.mock('@babble/api', async (original) => ({ ...(await original<typeof import('@babble/api')>()), ...api }));

const family: Family = {
  id: 'family-1',
  name: 'The Smiths',
  plan: 'free',
  created_at: '',
  babies: [],
  former_members: [],
  members: [
    { family_id: 'family-1', user_id: 'john', role: 'owner', display_name: 'John', created_at: '1' },
    { family_id: 'family-1', user_id: 'jane', role: 'caregiver', display_name: 'Jane', created_at: '2' },
  ],
};
const client = {} as BabbleClient;

describe('FamilyMembers', () => {
  it('lets the owner rename a caregiver', async () => {
    const onChanged = vi.fn(async () => undefined);
    render(<FamilyMembers client={client} family={family} userId="john" onChanged={onChanged} />);
    await userEvent.click(screen.getByRole('button', { name: 'Rename Jane' }));
    const field = screen.getByLabelText("Jane's name");
    await userEvent.clear(field);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
    await userEvent.type(field, ' Nana ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.renameMember).toHaveBeenCalledWith(client, { familyId: 'family-1', userId: 'jane' }, ' Nana ');
    expect(onChanged).toHaveBeenCalled();
    expect(screen.queryByLabelText("Jane's name")).not.toBeInTheDocument();
  });

  it('lets the owner remove a caregiver after confirming', async () => {
    const onChanged = vi.fn(async () => undefined);
    render(<FamilyMembers client={client} family={family} userId="john" onChanged={onChanged} />);
    expect(screen.queryByRole('button', { name: 'Remove John' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Jane' }));
    expect(screen.getByText(/Remove Jane from The Smiths\?/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(api.removeMember).toHaveBeenCalledWith(client, { familyId: 'family-1', userId: 'jane' });
    expect(onChanged).toHaveBeenCalled();
  });

  it('lets a caregiver rename only themselves and remove nobody', () => {
    render(<FamilyMembers client={client} family={family} userId="jane" onChanged={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Rename Jane' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename John' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Remove/ })).not.toBeInTheDocument();
  });

  it('shows each member as Admin, Caregiver or Read only', () => {
    const withViewer: Family = {
      ...family,
      members: [
        ...family.members,
        { family_id: 'family-1', user_id: 'gran', role: 'viewer', display_name: 'Gran', created_at: '3' },
      ],
    };
    render(<FamilyMembers client={client} family={withViewer} userId="john" onChanged={vi.fn()} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Caregiver')).toBeInTheDocument();
    expect(screen.getByText('Read only')).toBeInTheDocument();
  });

  it('lets an admin change a caregiver to read only', async () => {
    const onChanged = vi.fn(async () => undefined);
    render(<FamilyMembers client={client} family={family} userId="john" onChanged={onChanged} />);
    await userEvent.click(screen.getByRole('button', { name: "Change Jane's role" }));
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await userEvent.click(screen.getByRole('radio', { name: 'Read only' }));
    expect(screen.getByText(/can’t change anything/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.setMemberRole).toHaveBeenCalledWith(client, { familyId: 'family-1', userId: 'jane' }, 'viewer');
    expect(onChanged).toHaveBeenCalled();
  });

  it('keeps the only admin from stepping down', () => {
    render(<FamilyMembers client={client} family={family} userId="john" onChanged={vi.fn()} />);
    expect(screen.queryByRole('button', { name: "Change John's role" })).not.toBeInTheDocument();
  });

  it('lets an admin step down once there is another admin', () => {
    const twoAdmins: Family = {
      ...family,
      members: family.members.map((member) => ({ ...member, role: 'owner' as const })),
    };
    render(<FamilyMembers client={client} family={twoAdmins} userId="john" onChanged={vi.fn()} />);
    expect(screen.getByRole('button', { name: "Change John's role" })).toBeInTheDocument();
  });

  it('gives caregivers no role controls', () => {
    render(<FamilyMembers client={client} family={family} userId="jane" onChanged={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /role$/ })).not.toBeInTheDocument();
  });

  it('shows a failed change', async () => {
    api.removeMember.mockRejectedValueOnce(new Error('permission denied'));
    render(<FamilyMembers client={client} family={family} userId="john" onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Jane' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
