import type { PendingInvite } from '@babble/api';
import { sampleFamily } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { fixtureClient } from '@/fixtures/client';
import { InviteFlow } from './invite-flow';

const mockCreateInvite = jest.fn(async (..._args: unknown[]) => ({
  code: 'K7Q4M-D2XPA',
  expiresAt: '2026-10-20T09:00:00Z',
}));
jest.mock('@babble/api', () => {
  const api = jest.requireActual('@babble/api');
  return {
    ...api,
    pendingInvitesQuery: (_client: unknown, familyId: string) => ({
      queryKey: api.queryKeys.pendingInvites(familyId),
      queryFn: async (): Promise<PendingInvite[]> => [],
    }),
    createInvite: (...args: unknown[]) => mockCreateInvite(...args),
  };
});

async function renderFlow() {
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <InviteFlow client={fixtureClient} family={sampleFamily} billingEnabled={false} publicUrl="https://babble.test" />
    </QueryClientProvider>,
  );
}

afterEach(() => jest.clearAllMocks());

describe('InviteFlow', () => {
  it('asks what the new person can do before creating a code', async () => {
    await renderFlow();
    await fireEvent.press(screen.getByText('Invite someone'));
    expect(mockCreateInvite).not.toHaveBeenCalled();
    expect(screen.getByText(/can’t change settings/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Admin'));
    await fireEvent.press(screen.getByText('Create invite'));
    expect(mockCreateInvite).toHaveBeenCalledWith(fixtureClient, sampleFamily.id, 'owner');
    expect(screen.getByText('Joins as Admin')).toBeTruthy();
    expect(await screen.findByText('K7Q4M-D2XPA')).toBeTruthy();
  });

  it('defaults to a caregiver and can be cancelled', async () => {
    await renderFlow();
    await fireEvent.press(screen.getByText('Invite someone'));
    await fireEvent.press(screen.getByText('Cancel'));
    expect(screen.getByText('Invite someone')).toBeTruthy();
    await fireEvent.press(screen.getByText('Invite someone'));
    await fireEvent.press(screen.getByText('Create invite'));
    expect(mockCreateInvite).toHaveBeenCalledWith(fixtureClient, sampleFamily.id, 'caregiver');
  });
});
