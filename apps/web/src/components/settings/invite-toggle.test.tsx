import { sampleFamily } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fixtureClient } from '#/fixtures/client';
import { InviteToggle } from './invite-toggle';

const createInvite = vi.fn(async () => ({
  code: 'K7Q4M-D2XPA',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
}));
vi.mock('@babble/api', async (importOriginal) => {
  const api = await importOriginal<typeof import('@babble/api')>();
  return {
    ...api,
    pendingInvitesQuery: (_client: unknown, familyId: string) => ({
      queryKey: api.queryKeys.pendingInvites(familyId),
      queryFn: async () => [],
    }),
    createInvite: (...args: unknown[]) => createInvite(...(args as [])),
  };
});

function renderToggle() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <InviteToggle
        client={fixtureClient}
        family={sampleFamily}
        billingEnabled={false}
        publicUrl="https://babble.test"
      />
    </QueryClientProvider>,
  );
}

describe('InviteToggle', () => {
  it('asks what role the new person gets before creating the invite', async () => {
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: 'Invite someone' }));
    expect(screen.getByRole('radio', { name: 'Caregiver' })).toBeChecked();
    expect(createInvite).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('radio', { name: 'Admin' }));
    expect(screen.getByText(/manages who has access/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Create invite' }));

    expect(await screen.findByText('K7Q4M-D2XPA')).toBeInTheDocument();
    expect(screen.getByText('Joins as Admin')).toBeInTheDocument();
    expect(createInvite).toHaveBeenCalledWith(fixtureClient, sampleFamily.id, 'owner');
  });

  it('can be cancelled without creating an invite', async () => {
    createInvite.mockClear();
    renderToggle();
    await userEvent.click(screen.getByRole('button', { name: 'Invite someone' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Invite someone' })).toBeInTheDocument();
    expect(createInvite).not.toHaveBeenCalled();
  });
});
