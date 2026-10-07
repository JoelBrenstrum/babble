import { emptyDraft, type DraftOfType } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { NappyForm } from './nappy-form';

function Harness({ onDraft }: { onDraft: (draft: DraftOfType<'nappy'>) => void }) {
  const [draft, setDraft] = useState(emptyDraft('nappy', new Date('2026-10-06T10:00:00Z')));
  return (
    <NappyForm
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

describe('NappyForm', () => {
  it('only shows poo details for dirty nappies', async () => {
    await render(<Harness onDraft={jest.fn()} />);
    expect(screen.queryByText('Poo colour')).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Both' }));
    expect(screen.getByText('Poo colour')).toBeTruthy();
  });

  it('limits poo colours to two', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Dirty' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Mustard' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Green' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Brown' }));
    expect(onDraft.mock.calls.at(-1)![0].details).toMatchObject({
      wet: false,
      dirty: true,
      pooColours: ['mustard', 'green'],
    });
  });

  it('clears poo details when switching back to wet', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Dirty' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Mustard' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Wet' }));
    expect(onDraft.mock.calls.at(-1)![0].details).toMatchObject({ wet: true, dirty: false, pooColours: [] });
  });
});
