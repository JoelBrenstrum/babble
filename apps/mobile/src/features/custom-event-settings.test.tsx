import { sampleBaby } from '@babble/api/fixtures';
import type { BabbleClient } from '@babble/api';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { CustomEventSettings } from './custom-event-settings';

const mockAdd = jest.fn();
const mockRemove = jest.fn();
jest.mock('@babble/api/react', () => ({
  useCustomTitles: () => ({
    saved: ['Bath', 'Walk'],
    add: { mutate: mockAdd, error: null },
    remove: { mutate: mockRemove, error: null },
  }),
}));

const client = {} as BabbleClient;

describe('CustomEventSettings', () => {
  it('adds a new suggestion', async () => {
    await render(<CustomEventSettings client={client} babyId={sampleBaby.id} disabled={false} />);
    await fireEvent.changeText(screen.getByLabelText('Add a suggestion'), 'Calpol');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(mockAdd).toHaveBeenCalledWith('Calpol');
  });

  it('removes a suggestion', async () => {
    await render(<CustomEventSettings client={client} babyId={sampleBaby.id} disabled={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Walk' }));
    expect(mockRemove).toHaveBeenCalledWith('Walk');
  });
});
