import { sampleBaby } from '@babble/api/fixtures';
import type { CustomTitle } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureClient } from '#/fixtures/client';
import { CustomEventSettings } from './custom-event-settings';

const server = vi.hoisted(() => ({ failing: false, added: [] as CustomTitle[] }));
vi.mock('@babble/api/react', async () => {
  const { useState } = await import('react');
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
            server.added.push(entry);
            if (server.failing) options?.onError?.();
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

const saved = () => screen.getByRole('list', { name: 'Saved suggestions' });

describe('CustomEventSettings', () => {
  beforeEach(() => {
    server.failing = false;
    server.added = [];
  });

  it('adds a new suggestion to the list and clears the box', async () => {
    render(<CustomEventSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />);
    await userEvent.type(screen.getByLabelText('Add a suggestion'), 'Calpol{Enter}');
    expect(saved()).toHaveTextContent('Calpol');
    expect(screen.getByLabelText('Add a suggestion')).toHaveValue('');
  });

  it('saves an amount with its unit and shows the unit', async () => {
    render(<CustomEventSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />);
    await userEvent.type(screen.getByLabelText('Add a suggestion'), 'Calpol');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Amount' }));
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Unit'), 'ml');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(server.added).toEqual([{ title: 'Calpol', kind: 'amount', unit: 'ml' }]);
    expect(saved()).toHaveTextContent('Calpol· ml');
    expect(saved()).toHaveTextContent('Walk· min');
  });

  it('keeps the typed title when saving fails so it can be retried', async () => {
    server.failing = true;
    render(<CustomEventSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />);
    await userEvent.type(screen.getByLabelText('Add a suggestion'), 'Calpol{Enter}');
    expect(saved()).not.toHaveTextContent('Calpol');
    expect(screen.getByLabelText('Add a suggestion')).toHaveValue('Calpol');
  });

  it('will not add one that is already saved', async () => {
    render(<CustomEventSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />);
    await userEvent.type(screen.getByLabelText('Add a suggestion'), 'walk');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
  });

  it('removes a suggestion from the list', async () => {
    render(<CustomEventSettings client={fixtureClient} babyId={sampleBaby.id} disabled={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Walk' }));
    expect(saved()).not.toHaveTextContent('Walk');
    expect(saved()).toHaveTextContent('Bath');
  });
});
