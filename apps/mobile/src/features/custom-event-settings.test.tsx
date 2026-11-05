import { sampleBaby } from '@babble/api/fixtures';
import type { BabbleClient } from '@babble/api';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CustomEventSettings } from './custom-event-settings';

const mockServer = { failing: false };
jest.mock('@babble/api/react', () => {
  const { useState } = jest.requireActual<typeof import('react')>('react');
  return {
    useCustomTitles: () => {
      const [saved, setSaved] = useState(['Bath', 'Walk']);
      return {
        saved,
        add: {
          mutate: (title: string, options?: { onError?: () => void }) =>
            mockServer.failing ? options?.onError?.() : setSaved((list) => [...list, title]),
          error: null,
        },
        remove: {
          mutate: (title: string) => setSaved((list) => list.filter((item) => item !== title)),
          error: null,
        },
      };
    },
  };
});

const client = {} as BabbleClient;

describe('CustomEventSettings', () => {
  beforeEach(() => {
    mockServer.failing = false;
  });

  it('adds a new suggestion to the list and clears the box', async () => {
    await render(<CustomEventSettings client={client} babyId={sampleBaby.id} disabled={false} />);
    await fireEvent.changeText(screen.getByLabelText('Add a suggestion'), 'Calpol');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Calpol')).toBeOnTheScreen();
    expect(screen.getByLabelText('Add a suggestion')).toHaveDisplayValue('');
  });

  it('keeps the typed title when saving fails so it can be retried', async () => {
    mockServer.failing = true;
    await render(<CustomEventSettings client={client} babyId={sampleBaby.id} disabled={false} />);
    await fireEvent.changeText(screen.getByLabelText('Add a suggestion'), 'Calpol');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(screen.queryByText('Calpol')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('Add a suggestion')).toHaveDisplayValue('Calpol');
  });

  it('removes a suggestion from the list', async () => {
    await render(<CustomEventSettings client={client} babyId={sampleBaby.id} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Walk' }));
    expect(screen.queryByText('Walk')).not.toBeOnTheScreen();
    expect(screen.getByText('Bath')).toBeOnTheScreen();
  });
});
