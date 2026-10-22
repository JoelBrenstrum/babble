import { planSummary } from '@babble/config';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlusPlan } from './plus-plan';

describe('PlusPlan', () => {
  it('shows an active plus plan and what it includes', () => {
    render(<PlusPlan summary={planSummary(true, 'plus')!} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Included')).toBeInTheDocument();
    expect(screen.getByText('Sleep windows and predicted feeds on Home and the Timeline')).toBeInTheDocument();
  });

  it('tells a free family what plus adds', () => {
    render(<PlusPlan summary={planSummary(true, 'free')!} />);
    expect(screen.queryByText('Active')).toBeNull();
    expect(screen.getByText('Plus adds')).toBeInTheDocument();
    expect(screen.getByText(/free plan/)).toBeInTheDocument();
  });
});
