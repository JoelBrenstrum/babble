import { sampleBaby, sampleFamily } from '@babble/api/fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { fixtureClient } from '#/fixtures/client';
import { ExportData } from './export-data';

const exportData = vi.fn();
vi.mock('@babble/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@babble/api')>()),
  exportData: (...args: unknown[]) => exportData(...args),
}));

describe('ExportData', () => {
  it('shows a friendly error when the export fails', async () => {
    exportData.mockRejectedValue(new Error('TypeError: Failed to fetch'));
    render(<ExportData client={fixtureClient} family={sampleFamily} baby={sampleBaby} scope="baby" />);
    await userEvent.click(screen.getByRole('button', { name: `Export ${sampleBaby.name}` }));
    expect(await screen.findByText("Couldn't export. Check your connection and try again.")).toBeInTheDocument();
    expect(screen.queryByText(/Failed to fetch/)).toBeNull();
  });

  it('exports every baby in the family', async () => {
    exportData.mockReset().mockResolvedValue({ exportedAt: '2026-10-13T00:00:00Z' });
    URL.createObjectURL = vi.fn(() => 'blob:export');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ExportData client={fixtureClient} family={sampleFamily} baby={sampleBaby} scope="family" />);
    await userEvent.click(screen.getByRole('button', { name: 'Export whole family' }));
    expect(exportData).toHaveBeenCalledWith(
      fixtureClient,
      sampleFamily,
      sampleFamily.babies.map((baby) => baby.id),
      expect.any(Date),
    );
  });
});
