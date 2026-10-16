import type { BabbleClient } from '@babble/api';
import type { SessionMerge } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveMergeOffer, MergeSessionsRow } from './merge-sessions';

const merge = vi.fn(async (_args: unknown) => undefined);
vi.mock('@babble/api/react', async (original) => ({
  ...(await original<typeof import('@babble/api/react')>()),
  useMergeSessions: () => ({ mutateAsync: merge }),
}));

const client = {} as BabbleClient;
const pair: SessionMerge = { type: 'breast_feed', earlierId: 'feed-1', laterId: 'feed-2', gapMs: 12 * 60_000 };
const naps: SessionMerge = { type: 'sleep', earlierId: 'nap-1', laterId: 'nap-2', gapMs: 12 * 60_000 };

describe('MergeSessionsRow', () => {
  it('shows the gap and merges after confirming', async () => {
    merge.mockClear();
    render(<MergeSessionsRow client={client} babyId="baby-1" merge={pair} />);
    expect(screen.getByText('12m apart')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Merge' }));
    expect(merge).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('alertdialog', { name: 'Merge feeds' }).querySelector('button')!);
    await vi.waitFor(() => expect(merge).toHaveBeenCalledWith(pair));
  });

  it('merges two sleeps', async () => {
    merge.mockClear();
    render(<MergeSessionsRow client={client} babyId="baby-1" merge={naps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Merge' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Merge sleeps' });
    expect(dialog).toHaveTextContent(/shows as awake/);
    fireEvent.click(dialog.querySelector('button')!);
    await vi.waitFor(() => expect(merge).toHaveBeenCalledWith(naps));
  });
});

describe('LiveMergeOffer', () => {
  it('merges the running feed and reports back', async () => {
    merge.mockClear();
    const onMerged = vi.fn();
    render(
      <LiveMergeOffer client={client} babyId="baby-1" merge={{ ...pair, gapMs: 8 * 60_000 }} onMerged={onMerged} />,
    );
    expect(screen.getByText('Started 8m after the last feed')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Merge into it' }));
    fireEvent.click(screen.getByRole('button', { name: 'Merge' }));
    await vi.waitFor(() => expect(onMerged).toHaveBeenCalled());
    expect(merge).toHaveBeenCalledWith({ ...pair, gapMs: 8 * 60_000 });
  });

  it('offers to merge a running sleep into the last sleep', () => {
    render(<LiveMergeOffer client={client} babyId="baby-1" merge={naps} onMerged={vi.fn()} />);
    expect(screen.getByText('Started 12m after the last sleep')).toBeInTheDocument();
  });
});
