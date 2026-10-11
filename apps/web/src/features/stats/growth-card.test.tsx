import { growthReport, type BabyEvent } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { GrowthCard } from './growth-card';

function weighIn(id: string, at: string, weightG: number): BabyEvent {
  return {
    id,
    babyId: 'baby-1',
    createdBy: 'user-1',
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    source: 'manual',
    sessionState: null,
    endedBy: null,
    endRecordedAt: null,
    type: 'growth',
    startedAt: at,
    endedAt: null,
    notes: '',
    details: { weightG, lengthMm: null, headCircumferenceMm: null },
  } as BabyEvent;
}

const report = growthReport(
  [weighIn('g1', '2026-09-01T10:00:00Z', 3232), weighIn('g2', '2026-10-01T10:00:00Z', 4187)],
  { birthDate: '2026-09-01', sex: 'female', timeZone: 'UTC' },
  'metric',
);

async function renderCard() {
  render(
    <FixtureRouter>
      <GrowthCard report={report} babyName="Olivia" timeZone="UTC" />
    </FixtureRouter>,
  );
  await screen.findByRole('heading', { name: 'Growth' });
}

describe('GrowthCard', () => {
  it('shows the measurement and percentile for a hovered, focused or tapped point', async () => {
    await renderCard();
    const first = screen.getByRole('img', { name: '1 Sept · 3.23 kg · 50th percentile' });
    const second = screen.getByRole('img', { name: '1 Oct · 4.19 kg · 51st percentile' });
    expect(screen.queryByText('1 Sept · 3.23 kg · 50th percentile')).not.toBeInTheDocument();

    fireEvent.mouseEnter(first);
    expect(screen.getByText('1 Sept · 3.23 kg · 50th percentile')).toBeInTheDocument();
    fireEvent.mouseLeave(first);
    expect(screen.queryByText('1 Sept · 3.23 kg · 50th percentile')).not.toBeInTheDocument();

    fireEvent.focus(second);
    expect(screen.getByText('1 Oct · 4.19 kg · 51st percentile')).toBeInTheDocument();
    fireEvent.blur(second);
    fireEvent.click(first);
    expect(screen.getByText('1 Sept · 3.23 kg · 50th percentile')).toBeInTheDocument();
  });
});
