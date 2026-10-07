import { sampleBaby, sampleFamily, sampleRunningFeed } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ToastProvider } from '@/components/toast';
import { fixtureClient } from '@/fixtures/client';
import { RunningCard } from './running-card';

const mockDeleteEvent = jest.fn().mockResolvedValue(undefined);
jest.mock('@babble/api', () => ({
  ...jest.requireActual('@babble/api'),
  deleteEvent: (...args: unknown[]) => mockDeleteEvent(...args),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

async function renderCard(startedSecondsAgo: number) {
  const now = new Date();
  const event = {
    ...sampleRunningFeed(now),
    startedAt: new Date(now.getTime() - startedSecondsAgo * 1000).toISOString(),
  };
  const onDiscarded = jest.fn();
  await render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } } })}
    >
      <ToastProvider>
        <RunningCard
          event={event}
          client={fixtureClient}
          timeZone={sampleBaby.timezone}
          members={sampleFamily.members}
          onDiscarded={onDiscarded}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { event, onDiscarded };
}

describe('RunningCard discard', () => {
  beforeEach(() => mockDeleteEvent.mockClear());

  it('discards a session under a minute old without asking', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const { event, onDiscarded } = await renderCard(20);
    await fireEvent.press(screen.getByRole('button', { name: 'Discard feed' }));
    expect(alert).not.toHaveBeenCalled();
    await waitFor(() => expect(mockDeleteEvent).toHaveBeenCalledWith(fixtureClient, event.id));
    expect(onDiscarded).toHaveBeenCalled();
  });

  it('confirms before discarding a longer session', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { event } = await renderCard(10 * 60);
    await fireEvent.press(screen.getByRole('button', { name: 'Discard feed' }));
    expect(mockDeleteEvent).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith('Discard this feed?', expect.stringContaining('10m'), expect.any(Array));
    const buttons = alert.mock.calls[0]![2] as { text: string; onPress?: () => void }[];
    buttons.find((button) => button.text === 'Discard')!.onPress!();
    await waitFor(() => expect(mockDeleteEvent).toHaveBeenCalledWith(fixtureClient, event.id));
  });
});
