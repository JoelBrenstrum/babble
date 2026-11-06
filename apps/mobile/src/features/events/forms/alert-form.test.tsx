import { emptyDraft, type DraftOfType } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { AlertForm } from './alert-form';

const NOW = new Date('2026-10-06T10:00:00Z');

function Harness({ onDraft }: { onDraft: (draft: DraftOfType<'alert'>) => void }) {
  const [draft, setDraft] = useState({
    ...emptyDraft('alert', NOW),
    startedAt: '2026-10-06T09:15:00Z',
  });
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
  it('shows the length and picks activities and what ended it', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} />);
    expect(screen.getByText('45m')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Tummy time' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Reading' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Tired' }));
    expect(onDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ details: { activities: ['tummy_time', 'reading'], endedBy: 'tired' } }),
    );
  });

  it('clears what ended it when tapped again', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Hungry' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Hungry' }));
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ details: { activities: [], endedBy: null } }));
  });
});
