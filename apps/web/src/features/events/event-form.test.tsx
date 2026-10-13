import type { BabbleClient } from '@babble/api';
import { sampleBaby } from '@babble/api/fixtures';
import { emptyDraft, type EventDraft } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '#/components/ui/toast';
import { EventForm } from './event-form';

const rpc = vi.fn();
const client = { rpc } as unknown as BabbleClient;
const saved = { data: 'event-1', error: null };
const failed = { data: null, error: { message: 'Network down' } };

function renderForm(initial: EventDraft, focusAmounts = false, readOnly = false) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <EventForm
          client={client}
          babyId={sampleBaby.id}
          timeZone={sampleBaby.timezone}
          units="metric"
          initial={initial}
          focusAmounts={focusAmounts}
          readOnly={readOnly}
          onDone={onDone}
        />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { onDone };
}

const now = new Date(Date.now() - 60 * 60_000);

describe('EventForm save errors', () => {
  beforeEach(() => rpc.mockReset());

  it('keeps the entry and retries after a failed save', async () => {
    rpc.mockResolvedValueOnce(failed).mockResolvedValueOnce(saved);
    const { onDone } = renderForm({ ...emptyDraft('custom', now), details: { title: 'Bath', description: '' } });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("Couldn't save. Your entry is kept here.");
    expect(alert).toHaveTextContent('Something went wrong. Please try again.');
    expect(onDone).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledTimes(2);
  });
});

describe('EventForm pump finish', () => {
  beforeEach(() => rpc.mockReset());

  it('saves a pump without amounts', async () => {
    rpc.mockResolvedValue(saved);
    const pump = emptyDraft('pump', now);
    const { onDone } = renderForm(
      { ...pump, endedAt: now.toISOString(), details: { leftMl: 60, rightMl: 50, totalMl: null } },
      true,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save without amounts' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(rpc.mock.calls[0]![1].event).toMatchObject({ details: { left_ml: null, right_ml: null, total_ml: null } });
  });
});

describe('EventForm read only', () => {
  it('shows the entry with every field disabled and no save', () => {
    renderForm({ ...emptyDraft('nappy', now), notes: 'Big one' }, false, true);
    expect(screen.getByLabelText('Notes (optional)')).toBeDisabled();
    expect(screen.getByDisplayValue('Big one')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Save/ })).toBeNull();
  });
});
