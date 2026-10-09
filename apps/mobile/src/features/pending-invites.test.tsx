import type { PendingInvite } from '@babble/api';
import { sampleFamily } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { fixtureClient } from '@/fixtures/client';
import { CaregiversLabel, PendingInvites } from './pending-invites';

let mockPending: PendingInvite[] = [];
const mockRevokeInvite = jest.fn();
jest.mock('@babble/api', () => {
  const api = jest.requireActual('@babble/api');
  return {
    ...api,
    pendingInvitesQuery: (_client: unknown, familyId: string) => ({
      queryKey: api.queryKeys.pendingInvites(familyId),
      queryFn: async () => mockPending,
    }),
    revokeInvite: (...args: unknown[]) => mockRevokeInvite(...args),
  };
});

async function renderInvites() {
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })}>
      <CaregiversLabel client={fixtureClient} familyId={sampleFamily.id} editable />
      <PendingInvites client={fixtureClient} family={sampleFamily} />
    </QueryClientProvider>,
  );
}

describe('PendingInvites', () => {
  beforeEach(() => {
    mockPending = [
      {
        id: 'invite-1',
        code: 'K7Q4M-D2XPA',
        role: 'viewer',
        createdBy: 'user-jane',
        createdAt: '2026-10-08T09:00:00Z',
        expiresAt: new Date(Date.now() + 3 * 3_600_000 + 60_000).toISOString(),
      },
    ];
    mockRevokeInvite.mockReset();
  });

  it('lists pending invites and counts them in the heading', async () => {
    await renderInvites();
    expect(await screen.findByText('K7Q4M-D2XPA')).toBeTruthy();
    expect(screen.getByText('Viewer · by Jane · Expires in 3h')).toBeTruthy();
    expect(screen.getByText('Caregivers · 1 pending')).toBeTruthy();
  });

  it('confirms before revoking, then removes the invite', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockRevokeInvite.mockImplementation(async () => {
      mockPending = [];
    });
    await renderInvites();
    await fireEvent.press(await screen.findByRole('button', { name: 'Revoke invite K7Q4M-D2XPA' }));
    expect(mockRevokeInvite).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Revoke this invite?', 'The code will stop working.', expect.any(Array));
    const buttons = alert.mock.calls[0]![2] as { text: string; onPress?: () => void }[];
    await act(async () => buttons.find((button) => button.text === 'Revoke')!.onPress!());
    await waitFor(() => expect(screen.queryByText('K7Q4M-D2XPA')).toBeNull());
    expect(mockRevokeInvite).toHaveBeenCalledWith(fixtureClient, 'invite-1');
    expect(screen.getByText('Caregivers')).toBeTruthy();
  });
});
