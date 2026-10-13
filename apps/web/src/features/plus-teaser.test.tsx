import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PlusTeaser } from './plus-teaser';

describe('PlusTeaser', () => {
  it('opens the Plus popup for the locked feature', async () => {
    render(
      <PlusTeaser feature="insights" title="Patterns">
        Wake windows and more.
      </PlusTeaser>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'See what Plus adds' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('30-day timeline are part of Babble Plus');
  });
});
