import { sampleBaby } from '@babble/api/fixtures';
import { emptyDraft, type EventDraft } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ToastProvider } from '@/components/toast';
import { createFakeClient } from '@/fixtures/fake-client';
import { EventForm } from './event-form';

const fake = createFakeClient();
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

async function renderForm(initial: EventDraft, focusAmounts = false, readOnly = false) {
  const onDone = jest.fn();
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <ToastProvider>
        <EventForm
          client={fake.client}
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

describe('EventForm', () => {
  beforeEach(() => fake.rpc.mockReset());

  it('shows the entry without save or delete for read-only members', async () => {
    await renderForm({ ...emptyDraft('custom', now), details: { title: 'Bath', description: '' } }, false, true);
    expect(screen.getByText(/read-only access/)).toBeTruthy();
    expect(screen.getByDisplayValue('Bath')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('keeps the entry and retries after a failed save', async () => {
    fake.rpc
      .mockResolvedValueOnce({ data: null, error: new Error('offline') })
      .mockResolvedValueOnce({ data: 'event-1', error: null });
    const { onDone } = await renderForm({ ...emptyDraft('custom', now), details: { title: 'Bath', description: '' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText("Couldn't save.")).toBeTruthy();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(fake.rpc).toHaveBeenCalledTimes(2);
  });

  it('saves a finished pump without amounts', async () => {
    fake.rpc.mockResolvedValue({ data: 'event-1', error: null });
    const pump = emptyDraft('pump', now);
    const { onDone } = await renderForm(
      { ...pump, endedAt: now.toISOString(), details: { leftMl: 60, rightMl: 50, totalMl: null } },
      true,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save without amounts' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(fake.rpc.mock.calls[0]![1].event).toMatchObject({
      details: { left_ml: null, right_ml: null, total_ml: null },
    });
  });
});
