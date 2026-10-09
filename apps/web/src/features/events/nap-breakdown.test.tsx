import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NapBreakdown } from './nap-breakdown';

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 6, 9, minutes)).toISOString();
const now = new Date(at(90));

describe('NapBreakdown', () => {
  it('lists sleep and wake-ups with totals, and trims only the latest wake-up on a live nap', async () => {
    const onTrimAwake = vi.fn();
    render(
      <NapBreakdown
        nap={{
          startedAt: at(0),
          endedAt: null,
          segments: [
            { startedAt: at(0), endedAt: at(30) },
            { startedAt: at(35), endedAt: at(60) },
            { startedAt: at(70), endedAt: null },
          ],
        }}
        now={now}
        onTrimAwake={onTrimAwake}
      />,
    );
    expect(screen.getAllByText('Awake')).toHaveLength(2);
    expect(screen.getByText('sleeping')).toBeInTheDocument();
    expect(screen.getByText('awake 15m 00s')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take a minute off wake-up 1' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Take a minute off wake-up 2' }));
    expect(onTrimAwake).toHaveBeenCalledWith(1);
  });

  it('shows the counting wake-up while paused, without a minus', () => {
    render(
      <NapBreakdown
        nap={{ startedAt: at(0), endedAt: null, segments: [{ startedAt: at(0), endedAt: at(80) }] }}
        now={now}
        onTrimAwake={vi.fn()}
      />,
    );
    expect(screen.getByText('awake · counting')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Take a minute off/ })).toBeNull();
  });
});
