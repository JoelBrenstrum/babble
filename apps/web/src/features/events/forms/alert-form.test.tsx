import { pastDraft, type DraftOfType } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AlertForm } from './alert-form';

const NOW = new Date('2026-10-06T10:00:00Z');

function Harness({ onDraft }: { onDraft: (draft: DraftOfType<'alert'>) => void }) {
  const [draft, setDraft] = useState(pastDraft('alert', NOW) as DraftOfType<'alert'>);
  return (
    <AlertForm
      draft={draft}
      onChange={(next) => {
        setDraft(next);
        onDraft(next);
      }}
      errors={{}}
      timeZone="Pacific/Auckland"
      units="metric"
      isNew
    />
  );
}

describe('AlertForm', () => {
  it('starts as the last 20 minutes and shows how long that is', () => {
    render(<Harness onDraft={vi.fn()} />);
    expect(screen.getByText('Alert for 20m')).toBeInTheDocument();
  });

  it('picks activities and what ended it', async () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tummy time' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Reading' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Hungry' }));
    expect(onDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ details: { activities: ['tummy_time', 'reading'], endedBy: 'hungry' } }),
    );
  });
});
