import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SessionBreakdown } from './session-breakdown';

const at = (minutes: number, seconds = 0) => new Date(Date.UTC(2026, 9, 6, 10, minutes, seconds)).toISOString();

describe('SessionBreakdown', () => {
  it('lists sides with idle downtime and totals', () => {
    render(
      <SessionBreakdown
        segments={[
          { side: 'left', startedAt: at(0), endedAt: at(10, 32) },
          { side: 'right', startedAt: at(13, 34), endedAt: at(25, 57) },
        ]}
        mergeGapMs={15_000}
        now={new Date(at(30))}
      />,
    );
    expect(screen.getByText('Left')).toBeInTheDocument();
    expect(screen.getByText('Downtime')).toBeInTheDocument();
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(screen.getByText('10m 32s')).toBeInTheDocument();
    expect(screen.getByText('3m 02s')).toBeInTheDocument();
    expect(screen.getByText('22m 55s')).toBeInTheDocument();
    expect(screen.getByText('lost 3m 02s')).toBeInTheDocument();
  });

  it('marks the growing idle row while paused', () => {
    render(
      <SessionBreakdown
        segments={[{ side: 'left', startedAt: at(0), endedAt: at(10) }]}
        mergeGapMs={15_000}
        now={new Date(at(11, 12))}
        paused
      />,
    );
    expect(screen.getByText('idle · counting')).toBeInTheDocument();
    expect(screen.getByText('1m 12s')).toBeInTheDocument();
  });
});
