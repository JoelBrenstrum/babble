import { sampleBaby, sampleFamily, sampleRunningSleep } from '@babble/api/fixtures';
import type { BabyEvent } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ToastProvider } from '@/components/toast';
import { createFakeClient } from '@/fixtures/fake-client';
import { RunningCard } from './running-card';

const fake = createFakeClient();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: (href: string) => mockReplace(href) } }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

async function renderAlert() {
  const now = new Date();
  const sleep = sampleRunningSleep(now);
  const event = {
    ...sleep,
    id: 'alert-1',
    type: 'alert',
    sessionState: null,
    startedAt: new Date(now.getTime() - 25 * 60_000).toISOString(),
    details: { activities: [], endedBy: null },
  } as unknown as BabyEvent;
  delete (event as { segments?: unknown }).segments;
  await render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } } })}
    >
      <ToastProvider>
        <RunningCard event={event} client={fake.client} timeZone={sampleBaby.timezone} members={sampleFamily.members} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return event;
}

beforeEach(() => {
  fake.rpc.mockReset();
  fake.rpc.mockResolvedValue({ data: null, error: null });
  mockReplace.mockClear();
});

describe('AlertRunningCard', () => {
  it('asks what ended it and saves the reason', async () => {
    await renderAlert();
    expect(screen.getByText('Alert')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Fussy or crying' }));
    await waitFor(() =>
      expect(fake.rpc).toHaveBeenCalledWith('end_alert', { target_event_id: 'alert-1', reason: 'fussy' }),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('opens the nap the server starts when she fell asleep', async () => {
    fake.rpc.mockResolvedValue({ data: 'nap-1', error: null });
    await renderAlert();
    await fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Fell asleep' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/sessions/nap-1'));
    expect(fake.rpc).toHaveBeenCalledWith('end_alert', { target_event_id: 'alert-1', reason: 'asleep' });
  });

  it('stops without a reason when skipped', async () => {
    await renderAlert();
    await fireEvent.press(screen.getByRole('button', { name: 'Stop' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => expect(fake.rpc).toHaveBeenCalledWith('end_alert', { target_event_id: 'alert-1' }));
  });
});
