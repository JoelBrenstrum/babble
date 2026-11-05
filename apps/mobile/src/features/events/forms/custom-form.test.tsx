import { emptyDraft, type DraftOfType } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { CustomForm } from './custom-form';

function Harness({ onSaveTitle }: { onSaveTitle?: (title: string) => void }) {
  const [draft, setDraft] = useState<DraftOfType<'custom'>>(emptyDraft('custom', new Date('2026-10-06T10:00:00Z')));
  return (
    <CustomForm
      draft={draft}
      onChange={setDraft}
      errors={{}}
      timeZone="Pacific/Auckland"
      units="metric"
      isNew
      saved={['Bath']}
      suggestions={['Bath', 'Calpol']}
      onSaveTitle={onSaveTitle}
    />
  );
}

describe('CustomForm', () => {
  it('picks a recently used title', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Calpol' }));
    expect(screen.getByRole('checkbox', { name: 'Calpol' }).props.accessibilityState.checked).toBe(true);
  });

  it('offers to save a typed title that is not saved yet', async () => {
    const onSaveTitle = jest.fn();
    await render(<Harness onSaveTitle={onSaveTitle} />);
    expect(screen.queryByRole('button', { name: /Save “/ })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Vitamin D');
    await fireEvent.press(screen.getByRole('button', { name: 'Save “Vitamin D”' }));
    expect(onSaveTitle).toHaveBeenCalledWith('Vitamin D');
  });
});
