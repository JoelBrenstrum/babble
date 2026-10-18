import { sampleEvents } from '@babble/api/fixtures';
import type { EventOfType } from '@babble/domain';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ToastProvider } from '@/components/toast';
import { createFakeClient } from '@/fixtures/fake-client';
import { PumpAmountsEditor } from './pump-amounts-editor';

const fake = createFakeClient();
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

async function renderEditor() {
  const pump = sampleEvents(new Date()).find((event) => event.type === 'pump') as EventOfType<'pump'>;
  const event = { ...pump, endedAt: null, details: { leftMl: null, rightMl: 30, totalMl: null } };
  await render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { gcTime: Infinity } } })}>
      <ToastProvider>
        <PumpAmountsEditor event={event} client={fake.client} babyId={event.babyId} units="metric" />
      </ToastProvider>
    </QueryClientProvider>,
  );
  return event;
}

describe('PumpAmountsEditor', () => {
  beforeEach(() => fake.rpc.mockClear());

  it('saves each side while pumping without waiting for the finish', async () => {
    const event = await renderEditor();
    await fireEvent.press(screen.getByRole('button', { name: 'Increase left amount by 10' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Increase left amount by 10' }));

    expect(screen.getByText('Total 50 ml')).toBeTruthy();
    await waitFor(() =>
      expect(fake.rpc).toHaveBeenCalledWith('save_pump_amounts', {
        target_event_id: event.id,
        changes: { left_ml: 20 },
      }),
    );
    expect(fake.rpc).toHaveBeenCalledTimes(1);
  });
});
