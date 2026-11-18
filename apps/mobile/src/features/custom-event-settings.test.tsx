import { sampleBaby } from '@babble/api/fixtures';
import type { BabbleClient } from '@babble/api';
import type { CustomTitle } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CustomEventSettings } from './custom-event-settings';

const mockServer = { failing: false, added: [] as CustomTitle[] };
jest.mock('@babble/api/react', () => {
  const { useState } = jest.requireActual<typeof import('react')>('react');
  return {
    useCustomTitles: () => {
      const [saved, setSaved] = useState<CustomTitle[]>([
        { title: 'Bath', kind: 'note', unit: null },
        { title: 'Walk', kind: 'duration', unit: null },
      ]);
      return {
        saved,
        add: {
          mutate: (entry: CustomTitle, options?: { onError?: () => void }) => {
            mockServer.added.push(entry);
            if (mockServer.failing) options?.onError?.();
            else setSaved((list) => [...list, entry]);
          },
          error: null,
        },
        remove: {
          mutate: (title: string) => setSaved((list) => list.filter((item) => item.title !== title)),
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
    mockServer.added = [];
  });

  it('adds a new suggestion to the list and clears the box', async () => {
    await render(<CustomEventSettings client={client} babyId={sampleBaby.id} disabled={false} />);
    await fireEvent.changeText(screen.getByLabelText('Add a suggestion'), 'Calpol');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Calpol')).toBeOnTheScreen();
    expect(screen.getByLabelText('Add a suggestion')).toHaveDisplayValue('');
  });

  it('saves an amount with its unit and shows the unit', async () => {
    await render(<CustomEventSettings client={client} babyId={sampleBaby.id} disabled={false} />);
    await fireEvent.changeText(screen.getByLabelText('Add a suggestion'), 'Calpol');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Amount' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(mockServer.added).toEqual([]);
    await fireEvent.changeText(screen.getByLabelText('Unit'), 'ml');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(mockServer.added).toEqual([{ title: 'Calpol', kind: 'amount', unit: 'ml' }]);
    expect(screen.getByText('· ml')).toBeOnTheScreen();
    expect(screen.getByText('· min')).toBeOnTheScreen();
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
