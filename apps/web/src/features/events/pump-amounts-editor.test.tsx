import type { BabbleClient } from '@babble/api';
import { NotifyProvider } from '@babble/api/react';
import { sampleBaby, sampleEvents } from '@babble/api/fixtures';
import type { EventOfType, PumpDetails } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PumpAmountsEditor } from './pump-amounts-editor';

const rpc = vi.fn();
const client = { rpc } as unknown as BabbleClient;

function renderEditor(details: PumpDetails = { leftMl: null, rightMl: null, totalMl: null }) {
  const pump = sampleEvents(new Date()).find((event) => event.type === 'pump') as EventOfType<'pump'>;
  const event = { ...pump, endedAt: null, details };
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <NotifyProvider notify={vi.fn()}>
        <PumpAmountsEditor event={event} client={client} babyId={sampleBaby.id} units="metric" />
      </NotifyProvider>
    </QueryClientProvider>,
  );
}

describe('PumpAmountsEditor', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it('saves a burst of taps on one side as a single change', async () => {
    renderEditor();
    const increase = screen.getByRole('button', { name: 'Increase left amount by 10' });
    await userEvent.click(increase);
    await userEvent.click(increase);
    await userEvent.click(increase);

    expect(screen.getByLabelText('Left amount')).toHaveValue('30');
    expect(screen.getByText('Total 30 ml')).toBeInTheDocument();
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc).toHaveBeenCalledWith('save_pump_amounts', {
      target_event_id: expect.any(String),
      changes: { left_ml: 30 },
    });
  });

  it('only sends the side that was typed in', async () => {
    renderEditor({ leftMl: 40, rightMl: null, totalMl: null });
    await userEvent.type(screen.getByLabelText('Right amount'), '55');

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
    expect(rpc.mock.calls[0]![1].changes).toEqual({ right_ml: 55 });
    expect(screen.getByText('Total 95 ml')).toBeInTheDocument();
  });
});
