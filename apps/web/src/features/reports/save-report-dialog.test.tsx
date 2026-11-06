import type { SavedReport } from '@babble/api';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SaveReportDialog } from './save-report-dialog';

const report = (id: string, name: string): SavedReport => ({
  id,
  familyId: 'family-1',
  name,
  spec: {
    version: 1,
    range: { preset: '7d' },
    bucket: 'day',
    series: [{ measure: 'feeds.count' }],
    chart: 'bar',
    filters: [],
    options: {},
  },
  createdBy: 'user-1',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

describe('SaveReportDialog', () => {
  it('saves with the typed name', () => {
    const onSave = vi.fn();
    render(
      <SaveReportDialog
        initialName="Feeds per day"
        reports={[]}
        atLimit={false}
        saving={false}
        error={null}
        onSave={onSave}
        onReplace={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  Feeds  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith('Feeds');
  });

  it('offers Plus or a replacement at the free limit', () => {
    const onReplace = vi.fn();
    render(
      <SaveReportDialog
        initialName="Nap lengths"
        reports={[report('a', 'Night and naps'), report('b', 'Feeds')]}
        atLimit
        saving={false}
        error={null}
        onSave={vi.fn()}
        onReplace={onReplace}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("You've saved 2 reports")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    const replace = screen.getByRole('button', { name: 'Replace' });
    expect(replace).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Feeds' }));
    fireEvent.click(replace);
    expect(onReplace).toHaveBeenCalledWith('b', 'Nap lengths');
    fireEvent.click(screen.getByRole('button', { name: 'See Plus' }));
    expect(screen.getByRole('heading', { name: 'Babble Plus' })).toBeInTheDocument();
  });
});
