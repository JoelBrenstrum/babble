import { emptyDraft, type CustomTitle, type DraftOfType } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { CustomForm } from './custom-form';

const saved: CustomTitle[] = [
  { title: 'Bath', kind: 'note', unit: null },
  { title: 'Tummy time', kind: 'duration', unit: null },
  { title: 'Vitamin drops', kind: 'amount', unit: 'drops' },
];

function Harness({
  onSaveTitle,
  onDraft,
}: {
  onSaveTitle?: (entry: CustomTitle) => void;
  onDraft?: (draft: DraftOfType<'custom'>) => void;
}) {
  const [draft, setDraft] = useState<DraftOfType<'custom'>>(emptyDraft('custom', new Date('2026-10-06T10:00:00Z')));
  return (
    <CustomForm
      draft={draft}
      onChange={(next) => {
        setDraft(next);
        onDraft?.(next);
      }}
      errors={{}}
      timeZone="Pacific/Auckland"
      units="metric"
      isNew
      saved={saved}
      onSaveTitle={onSaveTitle}
    />
  );
}

describe('CustomForm', () => {
  it('captures minutes for a saved duration, stepping a minute at a time', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} />);
    expect(screen.queryByLabelText('Length')).toBeNull();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Tummy time' }));
    expect(screen.getByRole('checkbox', { name: 'Minutes' }).props.accessibilityState.checked).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'Increase length by 1' }));
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ endedAt: '2026-10-06T10:01:00.000Z' }));
  });

  it('captures an amount in the unit of a saved title', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Vitamin drops' }));
    expect(screen.getByLabelText('Unit')).toHaveDisplayValue('drops');
    await fireEvent.press(screen.getByRole('button', { name: 'Increase amount by 1' }));
    expect(onDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ details: expect.objectContaining({ kind: 'amount', amount: 1, unit: 'drops' }) }),
    );
  });

  it('offers to save a typed title with what it captures', async () => {
    const onSaveTitle = jest.fn();
    await render(<Harness onSaveTitle={onSaveTitle} />);
    expect(screen.queryByRole('button', { name: /Save “/ })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Walk');
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Minutes' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save “Walk”' }));
    expect(onSaveTitle).toHaveBeenCalledWith({ title: 'Walk', kind: 'duration', unit: null });
  });
});
