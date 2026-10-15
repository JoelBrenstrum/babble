import type { BabbleClient } from '@babble/api';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LiveMergeOffer, MergeFeedsRow } from './merge-feeds';

const merge = vi.fn(async (_args: unknown) => undefined);
vi.mock('@babble/api/react', async (original) => ({
  ...(await original<typeof import('@babble/api/react')>()),
  useMergeFeeds: () => ({ mutateAsync: merge }),
}));

const client = {} as BabbleClient;
const pair = { earlierId: 'feed-1', laterId: 'feed-2', gapMs: 12 * 60_000 };

describe('MergeFeedsRow', () => {
  it('shows the gap and merges after confirming', async () => {
    merge.mockClear();
    render(<MergeFeedsRow client={client} babyId="baby-1" merge={pair} />);
    expect(screen.getByText('12m apart')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Merge' }));
    expect(merge).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('alertdialog', { name: 'Merge feeds' }).querySelector('button')!);
    await vi.waitFor(() => expect(merge).toHaveBeenCalledWith({ earlierId: 'feed-1', laterId: 'feed-2' }));
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
    expect(merge).toHaveBeenCalledWith({ earlierId: 'feed-1', laterId: 'feed-2' });
  });
});
