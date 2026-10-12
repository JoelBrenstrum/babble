import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { InvitePanel } from './invite-panel';

describe('InvitePanel', () => {
  it('creates one invite even when effects run twice', async () => {
    const onCreate = vi.fn(async () => ({ code: 'K7Q4M-D2XPA', expiresAt: '2026-10-20T00:00:00Z' }));
    render(
      <StrictMode>
        <InvitePanel publicUrl="https://babble.test" onCreate={onCreate} />
      </StrictMode>,
    );
    expect(await screen.findByText('K7Q4M-D2XPA')).toBeInTheDocument();
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
