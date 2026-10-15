import type { BabbleClient, FamilyDevice } from '@babble/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { FamilyDevices } from './family-devices';

const mockDevices: FamilyDevice[] = [
  {
    sessionId: 's-pi',
    userId: 'jane',
    memberName: 'Jane',
    name: null,
    userAgent: 'okhttp/4.12.0',
    createdAt: '2026-10-14T00:00:00Z',
    lastActive: new Date(Date.now() - 5 * 60_000).toISOString(),
    current: false,
  },
];

const mockRename = jest.fn(async (..._args: unknown[]) => undefined);
const mockSignOut = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('@babble/api', () => ({
  ...jest.requireActual('@babble/api'),
  renameDevice: (...args: unknown[]) => mockRename(...args),
  signOutDevice: (...args: unknown[]) => mockSignOut(...args),
  familyDevicesQuery: () => ({ queryKey: ['family-devices', 'family-1'], queryFn: async () => mockDevices }),
}));

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

const client = {} as BabbleClient;

describe('FamilyDevices', () => {
  it('lists devices and lets an admin name one', async () => {
    await render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })}>
        <FamilyDevices client={client} familyId="family-1" admin />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Android app')).toBeTruthy();
    expect(screen.getByText('Jane · Active 5m ago')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Rename Android app (Jane)'));
    await fireEvent.changeText(screen.getByLabelText('Device name'), 'Nursery phone');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockRename).toHaveBeenCalledWith(client, 's-pi', 'Nursery phone');
  });

  it('signs another device out after confirming', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })}>
        <FamilyDevices client={client} familyId="family-1" admin />
      </QueryClientProvider>,
    );
    await fireEvent.press(await screen.findByLabelText('Sign out Android app (Jane)'));
    expect(alert.mock.calls[0]![0]).toBe('Sign out Android app (Jane)? It stops working within the hour.');
    const buttons = alert.mock.calls[0]![2]!;
    await buttons.find((button) => button.text === 'Sign out')!.onPress!();
    expect(mockSignOut).toHaveBeenCalledWith(client, 's-pi');
  });
});
