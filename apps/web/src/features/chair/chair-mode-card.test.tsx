import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { ChairModeCard } from './chair-mode-card';

async function renderCard(locked: boolean) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FixtureRouter>
        <ChairModeCard locked={locked} plusBadge />
      </FixtureRouter>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { name: 'Chair mode' });
}

describe('ChairModeCard', () => {
  it('previews chair mode with example screens for everyone', async () => {
    await renderCard(true);
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));
    const dialog = await screen.findByRole('dialog', { name: 'Chair mode preview' });
    expect(dialog).toHaveTextContent('Between feeds');
    expect(dialog).toHaveTextContent('During a feed');
    await userEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(screen.queryByRole('dialog', { name: 'Chair mode preview' })).toBeNull();
  });

  it('explains the Plus lock instead of opening chair mode', async () => {
    await renderCard(true);
    expect(screen.queryByRole('link', { name: /Open chair mode/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Open chair mode/ }));
    expect(await screen.findByRole('dialog', { name: 'Babble Plus' })).toHaveTextContent(
      'Chair mode is part of Babble Plus',
    );
  });

  it('opens chair mode on Plus', async () => {
    await renderCard(false);
    expect(screen.getByRole('link', { name: /Open chair mode/ })).toHaveAttribute('href', '/chair');
  });
});
