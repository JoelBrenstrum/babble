import type { BabbleClient } from '@babble/api';
import { NotifyProvider } from '@babble/api/react';
import { sampleBaby, sampleFamily, sampleRunningFeed, sampleRunningSleep } from '@babble/api/fixtures';
import type { BabyEvent } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast } from '#/components/ui/toast';
import { FixtureRouter } from '#/fixtures/router';
import { NapPromptProvider } from '#/features/nap-prompt';
import { RunningCard } from './running-card';

const eq = vi.fn();
const rpc = vi.fn();
const client = {
  from: () => ({ update: () => ({ eq }) }),
  rpc,
} as unknown as BabbleClient;

function ToastBridge({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  return (
    <NotifyProvider
      notify={(next) =>
        toast({ message: next.message, action: next.action && { label: next.action.label, onClick: next.action.run } })
      }
    >
      {children}
    </NotifyProvider>
  );
}

function renderCard(startedSecondsAgo: number, sample: (now: Date) => BabyEvent = sampleRunningFeed) {
  const now = new Date();
  const event = {
    ...sample(now),
    startedAt: new Date(now.getTime() - startedSecondsAgo * 1000).toISOString(),
  } as BabyEvent;
  const onDiscarded = vi.fn();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } } })}
    >
      <ToastProvider>
        <ToastBridge>
          <FixtureRouter>
            <NapPromptProvider client={client} babyId={event.babyId} babyName="Ada" timeZone={sampleBaby.timezone}>
              <RunningCard
                event={event}
                client={client}
                timeZone={sampleBaby.timezone}
                members={sampleFamily.members}
                onDiscarded={onDiscarded}
              />
            </NapPromptProvider>
          </FixtureRouter>
        </ToastBridge>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { event, onDiscarded };
}

describe('RunningCard discard', () => {
  beforeEach(() => {
    eq.mockReset().mockResolvedValue({ error: null });
    rpc.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it('discards a session under a minute old straight away, with undo', async () => {
    const { event, onDiscarded } = renderCard(30);
    await userEvent.click(await screen.findByRole('button', { name: 'Discard feed' }));
    await waitFor(() => expect(eq).toHaveBeenCalledWith('id', event.id));
    expect(await screen.findByText('Feed discarded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    await waitFor(() => expect(onDiscarded).toHaveBeenCalled());
  });

  it('asks for confirmation once a session has run for a minute', async () => {
    const { event } = renderCard(26 * 60);
    await userEvent.click(await screen.findByRole('button', { name: 'Discard feed' }));
    expect(eq).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Discard this feed?' })).toHaveTextContent('running for 26m');

    await userEvent.click(screen.getByRole('button', { name: 'Keep feed' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(eq).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Discard feed' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(eq).toHaveBeenCalledWith('id', event.id));
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
    renderCard(26 * 60, pausedFeed);
    expect(await screen.findByText(/^Paused for 1m 1[23]s$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Right · last/ })).toBeInTheDocument();
    expect(document.querySelector('[data-pulse]')).toBeNull();
  });

  it('pulses while a side is running and names who started it', async () => {
    renderCard(26 * 60);
    expect(await screen.findByText('Started by Jane')).toBeInTheDocument();
    expect(document.querySelector('[data-pulse]')).not.toBeNull();
  });
});

describe('RunningCard finishing', () => {
  beforeEach(() => {
    eq.mockReset().mockResolvedValue({ error: null });
    rpc.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it('offers to start a nap only after the feed has ended', async () => {
    renderCard(26 * 60);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    expect(await screen.findByRole('dialog', { name: 'Is Ada asleep?' })).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith('end_session', expect.objectContaining({ target_event_id: expect.any(String) }));
  });

  it('shows no prompt and swallows the rejection when ending fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Network request failed' } });
    renderCard(26 * 60);
    await userEvent.click(await screen.findByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(await screen.findByText(/connection/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not offer a nappy prompt when switching sides fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Network request failed' } });
    renderCard(26 * 60);
    await userEvent.click(await screen.findByRole('button', { name: /Left/ }));
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ends a nap', async () => {
    renderCard(10 * 60, sampleRunningSleep);
    await userEvent.click(await screen.findByRole('button', { name: 'End nap' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('end_session', expect.anything()));
  });
});
