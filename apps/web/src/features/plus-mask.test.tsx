import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PlusMask } from './plus-mask';

describe('PlusMask', () => {
  it('hides the content behind an explanation and opens the Plus popup', async () => {
    render(
      <PlusMask feature="insights" title="All-time stats" body="Every day since birth is part of Plus.">
        <button type="button">Hidden chart</button>
      </PlusMask>,
    );
    expect(screen.queryByRole('button', { name: 'Hidden chart' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'All-time stats' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'See what Plus adds' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Subscribe to Plus');
  });
});
