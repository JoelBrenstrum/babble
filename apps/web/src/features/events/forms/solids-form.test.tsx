import { emptyDraft, type BabyEvent, type DraftOfType } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SolidsForm } from './solids-form';

const NOW = new Date('2026-10-06T10:00:00Z');

const earlier = {
  ...emptyDraft('solids', new Date('2026-10-05T10:00:00Z')),
  id: 'meal-1',
  babyId: 'baby-1',
  createdBy: null,
  createdAt: '2026-10-05T10:00:00Z',
  updatedAt: '2026-10-05T10:00:00Z',
  deletedAt: null,
  source: 'manual',
  sessionState: null,
  endedBy: null,
  endRecordedAt: null,
  details: { foods: ['Mango'], amount: null, reaction: null },
} satisfies BabyEvent;

function Harness({
  onDraft,
  history = [],
  errors = {},
}: {
  onDraft: (draft: DraftOfType<'solids'>) => void;
  history?: BabyEvent[];
  errors?: Record<string, string>;
}) {
  const [draft, setDraft] = useState(emptyDraft('solids', NOW));
  return (
    <SolidsForm
      draft={draft}
      onChange={(next) => {
        setDraft(next);
        onDraft(next);
      }}
      errors={errors}
      timeZone="Pacific/Auckland"
      units="metric"
      isNew
      history={history}
    />
  );
}

describe('SolidsForm', () => {
  it('suggests recent foods before common first foods and toggles them', async () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} history={[earlier]} />);
    const chips = screen.getAllByRole('checkbox').map((chip) => chip.textContent);
    expect(chips.slice(0, 3)).toEqual(['Mango', 'Avocado', 'Banana']);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mango' }));
    expect(screen.getByRole('checkbox', { name: 'Mango' })).toHaveAttribute('aria-checked', 'true');
    expect(onDraft.mock.calls.at(-1)![0].details.foods).toEqual(['Mango']);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Mango' }));
    expect(onDraft.mock.calls.at(-1)![0].details.foods).toEqual([]);
  });

  it('adds a typed food with Enter and shows it as a first try', async () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} history={[earlier]} />);
    await userEvent.type(screen.getByLabelText('Add a food'), '  scrambled   egg {Enter}');
    expect(onDraft.mock.calls.at(-1)![0].details.foods).toEqual(['scrambled egg']);
    expect(screen.getByLabelText('Add a food')).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'scrambled egg' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('First try: scrambled egg')).toBeInTheDocument();
  });

  it('picks how much and the reaction, and can clear them', async () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Some' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Loved it' }));
    expect(onDraft.mock.calls.at(-1)![0].details).toMatchObject({ amount: 'some', reaction: 'loved' });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Loved it' }));
    expect(onDraft.mock.calls.at(-1)![0].details.reaction).toBeNull();
  });

  it('shows the foods error', () => {
    render(<Harness onDraft={vi.fn()} errors={{ foods: 'Add at least one food.' }} />);
    expect(screen.getByText('Add at least one food.')).toBeInTheDocument();
    expect(screen.getByLabelText('Add a food')).toHaveAttribute('aria-invalid', 'true');
  });
});
