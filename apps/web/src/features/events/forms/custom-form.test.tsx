import { emptyDraft, type DraftOfType } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
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
  it('shows saved and recently used titles as suggestions', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Calpol' }));
    expect(screen.getByLabelText('Title')).toHaveValue('Calpol');
    expect(screen.getByRole('checkbox', { name: 'Calpol' })).toBeChecked();
  });

  it('offers to save a typed title that is not saved yet', async () => {
    const onSaveTitle = vi.fn();
    render(<Harness onSaveTitle={onSaveTitle} />);
    expect(screen.queryByRole('button', { name: /Save “/ })).toBeNull();
    await userEvent.type(screen.getByLabelText('Title'), 'Vitamin D');
    await userEvent.click(screen.getByRole('button', { name: 'Save “Vitamin D”' }));
    expect(onSaveTitle).toHaveBeenCalledWith('Vitamin D');
  });

  it('does not offer to save a title that is already saved', async () => {
    render(<Harness onSaveTitle={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Title'), 'bath');
    expect(screen.queryByRole('button', { name: /Save “/ })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Bath' })).toBeChecked();
  });
});
