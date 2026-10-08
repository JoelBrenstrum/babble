import { sampleBaby } from '@babble/api/fixtures';
import { emptyDraft, type EventDraft } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '#/components/ui/toast';
import { fixtureClient } from '#/fixtures/client';
import { EventForm } from './event-form';

const saveEvent = vi.fn();
vi.mock('@babble/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@babble/api')>()),
  saveEvent: (...args: unknown[]) => saveEvent(...args),
}));

function renderForm(initial: EventDraft, focusAmounts = false) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <EventForm
          client={fixtureClient}
          babyId={sampleBaby.id}
          timeZone={sampleBaby.timezone}
          units="metric"
          initial={initial}
          focusAmounts={focusAmounts}
          onDone={onDone}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { onDone };
}

const now = new Date(Date.now() - 60 * 60_000);

describe('EventForm save errors', () => {
  beforeEach(() => saveEvent.mockReset());

  it('keeps the entry and retries after a failed save', async () => {
    saveEvent.mockRejectedValueOnce(new Error('Network down')).mockResolvedValueOnce('event-1');
    const { onDone } = renderForm({ ...emptyDraft('custom', now), details: { title: 'Bath', description: '' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't save. Your entry is kept here.");
    expect(alert).toHaveTextContent('Something went wrong. Please try again.');
    expect(onDone).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(saveEvent).toHaveBeenCalledTimes(2);
  });
});

describe('EventForm pump finish', () => {
  beforeEach(() => saveEvent.mockReset());

  it('saves a pump without amounts', async () => {
    saveEvent.mockResolvedValue('event-1');
    const pump = emptyDraft('pump', now);
    const { onDone } = renderForm(
      { ...pump, endedAt: now.toISOString(), details: { leftMl: 60, rightMl: 50, totalMl: null } },
      true,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save without amounts' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(saveEvent.mock.calls[0]![2]).toMatchObject({ details: { leftMl: null, rightMl: null, totalMl: null } });
  });
});
