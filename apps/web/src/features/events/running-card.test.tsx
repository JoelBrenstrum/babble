import { sampleBaby, sampleFamily, sampleRunningFeed } from '@babble/api/fixtures';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '#/components/ui/toast';
import { fixtureClient } from '#/fixtures/client';
import { FixtureRouter } from '#/fixtures/router';
import { RunningCard } from './running-card';

const deleteEvent = vi.fn().mockResolvedValue(undefined);
vi.mock('@babble/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@babble/api')>()),
  deleteEvent: (...args: unknown[]) => deleteEvent(...args),
}));

function renderCard(startedSecondsAgo: number) {
  const now = new Date();
  const event = {
    ...sampleRunningFeed(now),
    startedAt: new Date(now.getTime() - startedSecondsAgo * 1000).toISOString(),
  };
  const onDiscarded = vi.fn();
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } } })}
    >
      <ToastProvider>
        <FixtureRouter>
          <RunningCard
            event={event}
            client={fixtureClient}
            timeZone={sampleBaby.timezone}
            members={sampleFamily.members}
            onDiscarded={onDiscarded}
          />
        </FixtureRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { event, onDiscarded };
}

describe('RunningCard discard', () => {
  beforeEach(() => deleteEvent.mockClear());

  it('discards a session under a minute old straight away, with undo', async () => {
    const { event, onDiscarded } = renderCard(30);
    await userEvent.click(await screen.findByRole('button', { name: 'Discard feed' }));
    expect(deleteEvent).toHaveBeenCalledWith(fixtureClient, event.id);
    expect(await screen.findByText('Feed discarded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    await waitFor(() => expect(onDiscarded).toHaveBeenCalled());
  });

  it('asks for confirmation once a session has run for a minute', async () => {
    const { event } = renderCard(26 * 60);
    await userEvent.click(await screen.findByRole('button', { name: 'Discard feed' }));
    expect(deleteEvent).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Discard this feed?' })).toHaveTextContent('running for 26m');

    await userEvent.click(screen.getByRole('button', { name: 'Keep feed' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(deleteEvent).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Discard feed' }));
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(deleteEvent).toHaveBeenCalledWith(fixtureClient, event.id);
  });
});
