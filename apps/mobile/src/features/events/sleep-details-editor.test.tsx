import { sampleRunningSleep } from '@babble/api/fixtures';
import type { BabyEvent } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ToastProvider } from '@/components/toast';
import { fixtureClient } from '@/fixtures/client';
import { SleepDetailsEditor } from './sleep-details-editor';

const mockSaveSleepDetails = jest.fn().mockResolvedValue(undefined);
jest.mock('@babble/api', () => ({
  ...jest.requireActual('@babble/api'),
  saveSleepDetails: (...args: unknown[]) => mockSaveSleepDetails(...args),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

async function renderEditor() {
  const event = sampleRunningSleep(new Date()) as Extract<BabyEvent, { type: 'sleep' }>;
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { gcTime: Infinity } } })}>
      <ToastProvider>
        <SleepDetailsEditor event={event} client={fixtureClient} babyId={event.babyId} />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return event;
}

describe('SleepDetailsEditor', () => {
  beforeEach(() => mockSaveSleepDetails.mockClear());

  it('saves a detail straight away', async () => {
    const event = await renderEditor();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Cot' }));
    await waitFor(() =>
      expect(mockSaveSleepDetails).toHaveBeenCalledWith(fixtureClient, event.id, {
        locations: [...event.details.locations, 'cot'],
      }),
    );
  });

  it('saves notes when the field is left', async () => {
    const event = await renderEditor();
    const notes = screen.getByLabelText('Notes (optional)');
    await fireEvent(notes, 'focus');
    await fireEvent.changeText(notes, 'Went down easily');
    expect(mockSaveSleepDetails).not.toHaveBeenCalled();
    await fireEvent(notes, 'blur');
    await waitFor(() =>
      expect(mockSaveSleepDetails).toHaveBeenCalledWith(fixtureClient, event.id, { notes: 'Went down easily' }),
    );
  });
});
