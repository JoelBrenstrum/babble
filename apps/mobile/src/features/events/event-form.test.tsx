import { sampleBaby } from '@babble/api/fixtures';
import { emptyDraft, type EventDraft } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ToastProvider } from '@/components/toast';
import { fixtureClient } from '@/fixtures/client';
import { EventForm } from './event-form';

const mockSaveEvent = jest.fn();
jest.mock('@babble/api', () => ({
  ...jest.requireActual('@babble/api'),
  saveEvent: (...args: unknown[]) => mockSaveEvent(...args),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

async function renderForm(initial: EventDraft, focusAmounts = false) {
  const onDone = jest.fn();
  await render(
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

describe('EventForm', () => {
  beforeEach(() => mockSaveEvent.mockReset());

  it('keeps the entry and retries after a failed save', async () => {
    mockSaveEvent.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('event-1');
    const { onDone } = await renderForm({ ...emptyDraft('custom', now), details: { title: 'Bath', description: '' } });
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText("Couldn't save.")).toBeTruthy();
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockSaveEvent).toHaveBeenCalledTimes(2);
  });

  it('saves a finished pump without amounts', async () => {
    mockSaveEvent.mockResolvedValue('event-1');
    const pump = emptyDraft('pump', now);
    const { onDone } = await renderForm(
      { ...pump, endedAt: now.toISOString(), details: { leftMl: 60, rightMl: 50, totalMl: null } },
      true,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save without amounts' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(mockSaveEvent.mock.calls[0]![2]).toMatchObject({ details: { leftMl: null, rightMl: null, totalMl: null } });
  });
});
