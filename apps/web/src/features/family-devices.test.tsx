import type { BabbleClient, FamilyDevice } from '@babble/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { FamilyDevices } from './family-devices';

const devices: FamilyDevice[] = [
  {
    sessionId: 's-pi',
    userId: 'jane',
    memberName: 'Jane',
    name: null,
    userAgent: 'Mozilla/5.0 (X11; Linux aarch64) Chromium/126.0 Chrome/126.0 Safari/537.36',
    createdAt: '2026-10-14T00:00:00Z',
    lastActive: new Date(Date.now() - 5 * 60_000).toISOString(),
    current: false,
  },
  {
    sessionId: 's-mac',
    userId: 'john',
    memberName: 'John',
    name: 'Kitchen laptop',
    userAgent: null,
    createdAt: '2026-10-14T00:00:00Z',
    lastActive: new Date().toISOString(),
    current: true,
  },
];

const navigate = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));

const manyDevices: FamilyDevice[] = Array.from({ length: 11 }, (_, index) => ({
  ...devices[0]!,
  sessionId: `s-${index}`,
  name: `Device ${index + 1}`,
}));

const api = vi.hoisted(() => ({
  renameDevice: vi.fn(async () => undefined),
  signOutDevice: vi.fn(async () => undefined),
  signOutThisDevice: vi.fn(async () => undefined),
  familyDevicesQuery: vi.fn((_client: unknown, familyId: string) => ({
    queryKey: ['family-devices', familyId],
    queryFn: async () => (familyId === 'many' ? manyDevices : devices),
  })),
}));
vi.mock('@babble/api', async (original) => ({ ...(await original<typeof import('@babble/api')>()), ...api }));

const client = {} as BabbleClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('FamilyDevices', () => {
  it('lists every signed-in device for an admin, named or not', async () => {
    render(<FamilyDevices client={client} familyId="family-1" admin />, { wrapper });
    expect(await screen.findByText('Linux (Chromium)')).toBeInTheDocument();
    expect(screen.getByText('Jane · Active 5m ago')).toBeInTheDocument();
    expect(screen.getByText('Kitchen laptop')).toBeInTheDocument();
    expect(screen.getByText('John · This device')).toBeInTheDocument();
    expect(screen.getByText('Signed-in devices')).toBeInTheDocument();
  });

  it('renames another member’s device', async () => {
    render(<FamilyDevices client={client} familyId="family-1" admin />, { wrapper });
    await userEvent.click(await screen.findByRole('button', { name: 'Rename Linux (Chromium) (Jane)' }));
    await userEvent.type(screen.getByLabelText('Device name'), 'Chair');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.renameDevice).toHaveBeenCalledWith(client, 's-pi', 'Chair');
  });

  it('calls them your devices for everyone else', async () => {
    render(<FamilyDevices client={client} familyId="family-1" admin={false} />, { wrapper });
    expect(await screen.findByText('Your devices')).toBeInTheDocument();
  });

  it('signs another member’s device out after confirming', async () => {
    render(<FamilyDevices client={client} familyId="family-1" admin />, { wrapper });
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out Linux (Chromium) (Jane)' }));
    expect(screen.getByText('Sign out Linux (Chromium) (Jane)? It stops working within the hour.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(api.signOutDevice).toHaveBeenCalledWith(client, 's-pi');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('signs this device out locally and goes to sign in', async () => {
    render(<FamilyDevices client={client} familyId="family-1" admin />, { wrapper });
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out Kitchen laptop (John)' }));
    expect(screen.getByText('Sign out of babble on this device?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(api.signOutThisDevice).toHaveBeenCalledWith(client, 's-mac');
    expect(navigate).toHaveBeenCalledWith({ to: '/sign-in', search: { invite: undefined } });
  });

  it('shows eight devices until asked for more', async () => {
    render(<FamilyDevices client={client} familyId="many" admin />, { wrapper });
    expect(await screen.findByText('Device 8')).toBeInTheDocument();
    expect(screen.queryByText('Device 9')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show 3 more' }));
    expect(screen.getByText('Device 11')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show fewer' }));
    expect(screen.queryByText('Device 11')).not.toBeInTheDocument();
  });
});
