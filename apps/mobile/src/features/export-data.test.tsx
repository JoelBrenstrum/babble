import { sampleBaby, sampleFamily } from '@babble/api/fixtures';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { fixtureClient } from '@/fixtures/client';
import { ExportData } from './export-data';

const mockExportData = jest.fn();
const mockShare = jest.fn().mockResolvedValue(undefined);
const mockWrite = jest.fn();
jest.mock('@babble/api', () => ({
  ...jest.requireActual('@babble/api'),
  exportData: (...args: unknown[]) => mockExportData(...args),
}));
jest.mock('expo-sharing', () => ({ shareAsync: (...args: unknown[]) => mockShare(...args) }));
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'cache' },
  File: jest.fn().mockImplementation((_dir: string, name: string) => ({
    uri: `file:///cache/${name}`,
    create: jest.fn(),
    write: (...args: unknown[]) => mockWrite(...args),
  })),
}));

describe('ExportData', () => {
  it('writes the export to a file and opens the share sheet', async () => {
    mockExportData.mockResolvedValue({ format: 'babble-export', version: 1, exportedAt: '2026-10-08T09:00:00.000Z' });
    await render(<ExportData client={fixtureClient} family={sampleFamily} baby={sampleBaby} />);
    await fireEvent.press(screen.getByRole('button', { name: `Export ${sampleBaby.name}` }));
    await waitFor(() =>
      expect(mockShare).toHaveBeenCalledWith(
        `file:///cache/babble-${sampleBaby.name.toLowerCase()}-2026-10-08.json`,
        expect.objectContaining({ mimeType: 'application/json' }),
      ),
    );
    expect(mockExportData).toHaveBeenCalledWith(fixtureClient, sampleFamily, [sampleBaby.id], expect.any(Date));
    expect(JSON.parse(mockWrite.mock.calls[0]![0] as string)).toMatchObject({ format: 'babble-export' });
  });

  it('shows a friendly error when the export fails', async () => {
    mockExportData.mockRejectedValue(new Error('Network request failed'));
    await render(<ExportData client={fixtureClient} family={sampleFamily} baby={sampleBaby} />);
    await fireEvent.press(screen.getByRole('button', { name: `Export ${sampleBaby.name}` }));
    expect(await screen.findByText("Couldn't export. Check your connection and try again.")).toBeTruthy();
    expect(screen.queryByText(/Network request failed/)).toBeNull();
  });
});
