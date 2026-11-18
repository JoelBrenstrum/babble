import type { SavedReport } from '@babble/api';
import { defaultDashboard } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddCardSheet } from './add-card-sheet';

const report: SavedReport = {
  id: 'r1',
  familyId: 'f1',
  name: 'Bottle intake',
  spec: {
    version: 1,
    range: { preset: '30d' },
    bucket: 'day',
    series: [{ measure: 'feeds.bottleMl' }],
    chart: 'line',
    filters: [],
    options: {},
  },
  createdBy: 'u1',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

describe('AddCardSheet', () => {
  it('lists what is not on the dashboard yet and locks Plus cards', () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(<AddCardSheet layout={defaultDashboard()} reports={[report]} plusLocked onAdd={onAdd} onClose={onClose} />);
    expect(screen.queryByRole('button', { name: /^Sleep$/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Wake windows/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Bottle intake' }));
    expect(onAdd).toHaveBeenCalledWith({ kind: 'report', reportId: 'r1', size: 'm' });
    expect(onClose).toHaveBeenCalled();
  });

  it('adds a note', () => {
    const onAdd = vi.fn();
    render(
      <AddCardSheet layout={defaultDashboard()} reports={[]} plusLocked={false} onAdd={onAdd} onClose={vi.fn()} />,
    );
    expect(screen.getByText('Every saved report is on the dashboard. Save more in Reports.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'A short note between the cards' }));
    expect(onAdd).toHaveBeenCalledWith({ kind: 'text', body: '', size: 's' });
  });
});
