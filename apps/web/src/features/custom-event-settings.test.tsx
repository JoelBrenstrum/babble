import { sampleBaby } from '@babble/api/fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fixtureClient } from '#/fixtures/client';
import { CustomEventSettings } from './custom-event-settings';

const add = vi.fn();
const remove = vi.fn();
vi.mock('@babble/api/react', () => ({
  useCustomTitles: () => ({
    saved: ['Bath', 'Walk'],
    add: { mutate: add, error: null },
    remove: { mutate: remove, error: null },
  }),
}));

describe('CustomEventSettings', () => {
  it('adds a new suggestion', async () => {
    render(<CustomEventSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />);
    await userEvent.type(screen.getByLabelText('Add a suggestion'), 'Calpol{Enter}');
    expect(add).toHaveBeenCalledWith('Calpol');
    expect(screen.getByLabelText('Add a suggestion')).toHaveValue('');
  });

  it('will not add one that is already saved', async () => {
    render(<CustomEventSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />);
    await userEvent.type(screen.getByLabelText('Add a suggestion'), 'walk');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('removes a suggestion', async () => {
    render(<CustomEventSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Walk' }));
    expect(remove).toHaveBeenCalledWith('Walk');
  });
});
