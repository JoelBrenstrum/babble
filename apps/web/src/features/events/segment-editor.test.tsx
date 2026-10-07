import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentEditor } from './segment-editor';

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 6, 10, minutes)).toISOString();
const segments = [
  { side: 'left' as const, startedAt: at(0), endedAt: at(10) },
  { side: 'right' as const, startedAt: at(12), endedAt: at(20) },
];

describe('SegmentEditor', () => {
  it('shows each side and the downtime between them', () => {
    render(<SegmentEditor startedAt={at(0)} segments={segments} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Segment 1 minutes')).toHaveValue('10');
    expect(screen.getByLabelText('Downtime 2 minutes')).toHaveValue('2');
    expect(screen.getByLabelText('Segment 3 minutes')).toHaveValue('8');
  });

  it('recomputes timestamps when a downtime changes', async () => {
    const onChange = vi.fn();
    render(<SegmentEditor startedAt={at(0)} segments={segments} onChange={onChange} />);
    const downtime = screen.getByLabelText('Downtime 2 minutes');
    await userEvent.clear(downtime);
    await userEvent.type(downtime, '5');
    expect(onChange.mock.calls.at(-1)![0]).toEqual({
      segments: [
        { side: 'left', startedAt: at(0), endedAt: at(10) },
        { side: 'right', startedAt: at(15), endedAt: at(23) },
      ],
      endedAt: at(23),
    });
  });

  it('switches a side and removes a downtime', async () => {
    const onChange = vi.fn();
    render(<SegmentEditor startedAt={at(0)} segments={segments} onChange={onChange} />);
    await userEvent.click(screen.getAllByRole('radio', { name: 'Right' })[0]!);
    await userEvent.click(screen.getByRole('button', { name: 'Remove downtime 2' }));
    expect(
      onChange.mock.calls.at(-1)![0].segments.map((s: { side: string; startedAt: string }) => [s.side, s.startedAt]),
    ).toEqual([
      ['right', at(0)],
      ['right', at(10)],
    ]);
  });

  it('adds a side, alternating from the last one', async () => {
    const onChange = vi.fn();
    render(<SegmentEditor startedAt={at(0)} segments={segments} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add side' }));
    expect(onChange.mock.calls.at(-1)![0].segments.at(-1)).toEqual({
      side: 'left',
      startedAt: at(20),
      endedAt: at(25),
    });
  });
});
