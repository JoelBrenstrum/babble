import { emptyDraft, type CustomTitle, type DraftOfType } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
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
  it('only suggests saved titles', () => {
    render(<Harness />);
    expect(screen.getAllByRole('checkbox', { name: /Bath|Tummy time|Vitamin drops/ })).toHaveLength(3);
  });

  it('captures minutes for a saved duration, stepping a minute at a time', async () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} />);
    expect(screen.queryByLabelText('Length')).toBeNull();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Tummy time' }));
    expect(screen.getByRole('checkbox', { name: 'Minutes' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Increase length by 1' }));
    expect(screen.getByLabelText('Length')).toHaveValue('1');
    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({ endedAt: '2026-10-06T10:01:00.000Z' }));
  });

  it('captures an amount in the unit of a saved title', async () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Vitamin drops' }));
    expect(screen.getByLabelText('Unit')).toHaveValue('drops');
    await userEvent.click(screen.getByRole('button', { name: 'Increase amount by 1' }));
    await userEvent.click(screen.getByRole('button', { name: 'Increase amount by 1' }));
    expect(onDraft).toHaveBeenLastCalledWith(
      expect.objectContaining({ details: expect.objectContaining({ kind: 'amount', amount: 2, unit: 'drops' }) }),
    );
  });

  it('offers to save a typed title with what it captures', async () => {
    const onSaveTitle = vi.fn();
    render(<Harness onSaveTitle={onSaveTitle} />);
    expect(screen.queryByRole('button', { name: /Save “/ })).toBeNull();
    await userEvent.type(screen.getByLabelText('Title'), 'Walk');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Minutes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save “Walk”' }));
    expect(onSaveTitle).toHaveBeenCalledWith({ title: 'Walk', kind: 'duration', unit: null });
  });

  it('does not offer to save a title that is already saved', async () => {
    render(<Harness onSaveTitle={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Title'), 'bath');
    expect(screen.queryByRole('button', { name: /Save “/ })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Bath' })).toBeChecked();
  });
});
