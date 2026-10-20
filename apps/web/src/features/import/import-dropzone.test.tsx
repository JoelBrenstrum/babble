import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImportDropzone } from './import-dropzone';

describe('ImportDropzone', () => {
  it('invites a file and names the one chosen', () => {
    const { rerender } = render(<ImportDropzone fileName={null} onChoose={() => {}} />);
    expect(screen.getByText('Choose a file or drop it here')).toBeInTheDocument();
    rerender(<ImportDropzone fileName="week.csv" onChoose={() => {}} />);
    expect(screen.getByText('week.csv')).toBeInTheDocument();
    expect(screen.getByText('Choose or drop a different file')).toBeInTheDocument();
  });

  it('hands over a picked file', async () => {
    const onChoose = vi.fn();
    render(<ImportDropzone fileName={null} onChoose={onChoose} />);
    const file = new File(['Type,Start'], 'week.csv', { type: 'text/csv' });
    await userEvent.upload(screen.getByLabelText('File to import'), file);
    expect(onChoose).toHaveBeenCalledWith(file);
  });

  it('highlights while dragging and takes the dropped file', () => {
    const onChoose = vi.fn();
    render(<ImportDropzone fileName={null} onChoose={onChoose} />);
    const zone = screen.getByText('Choose a file or drop it here').closest('label')!;
    fireEvent.dragEnter(zone, { dataTransfer: { files: [] } });
    expect(screen.getByText('Drop to import')).toBeInTheDocument();
    const file = new File(['{}'], 'export.json', { type: 'application/json' });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onChoose).toHaveBeenCalledWith(file);
    expect(screen.getByText('Choose a file or drop it here')).toBeInTheDocument();
  });
});
