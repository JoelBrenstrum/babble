import type { PendingInvite } from '@babble/api';
import { sampleFamily } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureClient } from '#/fixtures/client';
import { CaregiversLabel, PendingInvites } from './pending-invites';

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000 + 60_000).toISOString();

let pending: PendingInvite[] = [];
const revokeInvite = vi.fn();
vi.mock('@babble/api', async (importOriginal) => {
  const api = await importOriginal<typeof import('@babble/api')>();
  return {
    ...api,
    pendingInvitesQuery: (_client: unknown, familyId: string) => ({
      queryKey: api.queryKeys.pendingInvites(familyId),
      queryFn: async () => pending,
    }),
    revokeInvite: (...args: unknown[]) => revokeInvite(...args),
  };
});

function renderInvites() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CaregiversLabel client={fixtureClient} familyId={sampleFamily.id} editable />
      <PendingInvites client={fixtureClient} family={sampleFamily} />
    </QueryClientProvider>,
  );
}

describe('PendingInvites', () => {
  beforeEach(() => {
    pending = [
      {
        id: 'invite-1',
        code: 'K7Q4M-D2XPA',
        role: 'caregiver',
        createdBy: 'user-john',
        createdAt: '2026-10-08T09:00:00Z',
        expiresAt: inDays(6),
      },
    ];
    revokeInvite.mockReset();
  });

  it('lists pending invites with their code, role, creator and expiry', async () => {
    renderInvites();
    const list = await screen.findByRole('list', { name: 'Pending invites' });
    expect(within(list).getByText('K7Q4M-D2XPA')).toBeInTheDocument();
    expect(within(list).getByText('Caregiver · by John · Expires in 6 days')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Caregivers · 1 pending' })).toBeInTheDocument();
  });

  it('confirms before revoking, then removes the invite', async () => {
    revokeInvite.mockImplementation(async () => {
      pending = [];
    });
    renderInvites();
    await userEvent.click(await screen.findByRole('button', { name: 'Revoke invite K7Q4M-D2XPA' }));
    expect(screen.getByText('Revoke this invite? The code will stop working.')).toBeInTheDocument();
    expect(revokeInvite).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(revokeInvite).toHaveBeenCalledWith(fixtureClient, 'invite-1');
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Pending invites' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Caregivers' })).toBeInTheDocument();
  });

  it('keeps the invite when cancelled', async () => {
    renderInvites();
    await userEvent.click(await screen.findByRole('button', { name: 'Revoke invite K7Q4M-D2XPA' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(revokeInvite).not.toHaveBeenCalled();
    expect(screen.getByText('K7Q4M-D2XPA')).toBeInTheDocument();
  });

  it('shows why a revoke failed', async () => {
    revokeInvite.mockRejectedValue(new Error('Network request failed'));
    renderInvites();
    await userEvent.click(await screen.findByRole('button', { name: 'Revoke invite K7Q4M-D2XPA' }));
    await userEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('K7Q4M-D2XPA')).toBeInTheDocument();
  });
});
