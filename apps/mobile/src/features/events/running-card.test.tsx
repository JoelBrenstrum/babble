import { sampleBaby, sampleFamily, sampleRunningFeed, sampleRunningSleep } from '@babble/api/fixtures';
import type { BabyEvent } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ToastProvider } from '@/components/toast';
import { fixtureClient } from '@/fixtures/client';
import { RunningCard } from './running-card';

const mockDeleteEvent = jest.fn().mockResolvedValue(undefined);
const mockSetSessionStart = jest.fn().mockResolvedValue(undefined);
const mockEndSession = jest.fn().mockResolvedValue(undefined);
const mockPauseSession = jest.fn().mockResolvedValue(undefined);
jest.mock('@babble/api', () => ({
  ...jest.requireActual('@babble/api'),
  deleteEvent: (...args: unknown[]) => mockDeleteEvent(...args),
  setSessionStart: (...args: unknown[]) => mockSetSessionStart(...args),
  endSession: (...args: unknown[]) => mockEndSession(...args),
  pauseSession: (...args: unknown[]) => mockPauseSession(...args),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

async function renderCard(startedSecondsAgo: number, sample: (now: Date) => BabyEvent = sampleRunningFeed) {
  const now = new Date();
  const event = {
    ...sample(now),
    startedAt: new Date(now.getTime() - startedSecondsAgo * 1000).toISOString(),
  } as BabyEvent;
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

describe('RunningCard start time', () => {
  it('moves the start earlier', async () => {
    const { event } = await renderCard(60);
    await fireEvent.press(screen.getByRole('button', { name: /change start time/i }));
    await fireEvent.press(screen.getByRole('button', { name: '10 min earlier' }));
    const expected = new Date(Date.parse(event.startedAt) - 10 * 60_000).toISOString();
    await waitFor(() => expect(mockSetSessionStart).toHaveBeenCalledWith(fixtureClient, event.id, expected));
  });
});

describe('RunningCard end time', () => {
  it('ends earlier, but not before the current side started', async () => {
    const { event } = await renderCard(30 * 60);
    await fireEvent.press(screen.getByRole('button', { name: 'Ended earlier?' }));
    expect(screen.getByRole('button', { name: '15 min ago' })).toBeDisabled();
    const before = Date.now();
    await fireEvent.press(screen.getByRole('button', { name: '5 min ago' }));
    await waitFor(() => expect(mockEndSession).toHaveBeenCalledWith(fixtureClient, event.id, expect.any(String)));
    const at = Date.parse(mockEndSession.mock.calls[0]![2] as string);
    expect(before - at).toBeGreaterThanOrEqual(5 * 60_000 - 1000);
    expect(before - at).toBeLessThan(5 * 60_000 + 1000);
  });
});

describe('RunningCard nap', () => {
  it('pauses a nap and shows the baby as awake', async () => {
    const { event } = await renderCard(30 * 60, sampleRunningSleep);
    expect(screen.getByText('Napping')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Pause nap' }));
    await waitFor(() => expect(mockPauseSession).toHaveBeenCalledWith(fixtureClient, event.id));
  });
});

function pausedFeed(now: Date): BabyEvent {
  const feed = sampleRunningFeed(now);
  if (feed.type !== 'breast_feed') throw new Error('expected a breastfeed');
  const pausedAt = new Date(now.getTime() - 72_000).toISOString();
  return { ...feed, segments: feed.segments.map((segment) => ({ ...segment, endedAt: segment.endedAt ?? pausedAt })) };
}

describe('RunningCard paused', () => {
  it('shows how long the feed has been paused and marks the last side', async () => {
    await renderCard(26 * 60, pausedFeed);
    expect(screen.getByText(/^Paused for 1m 1[23]s$/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Right, last' })).toBeTruthy();
    expect(screen.getByTestId('session-dot-paused')).toBeTruthy();
  });

  it('names who started a running session', async () => {
    await renderCard(60);
    expect(screen.getByText('Started by Jane')).toBeTruthy();
    expect(screen.getByTestId('session-dot-running')).toBeTruthy();
  });
});
