import type { BabyEvent } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EndTimeEditor } from './end-time-editor';

const feed = {
  id: 'feed-1',
  babyId: 'baby-1',
  createdBy: 'user-1',
  createdAt: '2026-10-11T10:30:00Z',
  updatedAt: '2026-10-11T10:30:00Z',
  deletedAt: null,
  source: 'manual',
  sessionState: 'running',
  endedBy: null,
  endRecordedAt: null,
  type: 'breast_feed',
  startedAt: '2026-10-11T10:30:00Z',
  endedAt: null,
  notes: '',
  segments: [{ side: 'left', startedAt: '2026-10-11T10:30:00Z', endedAt: null }],
  details: {},
} as unknown as BabyEvent;

describe('EndTimeEditor around midnight', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-11T12:10:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('reads a late-evening time picked after midnight as last night', () => {
    const onEnd = vi.fn();
    render(<EndTimeEditor event={feed} timeZone="Pacific/Auckland" onEnd={onEnd} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('End time'), { target: { value: '2026-10-12T23:45' } });
    expect(screen.queryByText("The end can't be in the future.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'End feed at 11:45 pm' }));
    expect(onEnd).toHaveBeenCalledWith('2026-10-11T10:45:00.000Z');
  });

  it('keeps the quick buttons available during the night', () => {
    render(<EndTimeEditor event={feed} timeZone="Pacific/Auckland" onEnd={vi.fn()} onCancel={vi.fn()} />);
    for (const minutes of [5, 10, 15, 30]) {
      expect(screen.getByRole('button', { name: `${minutes} min ago` })).toBeEnabled();
    }
  });
});
