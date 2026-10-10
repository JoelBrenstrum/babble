import { emptyDraft, type BabyEvent, type DraftOfType } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
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

const checked = (name: string) => screen.getByRole('checkbox', { name }).props.accessibilityState.checked;

describe('SolidsForm', () => {
  it('suggests recent foods first and toggles them', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} history={[earlier]} />);
    const labels = screen.getAllByRole('checkbox').map((chip) => chip.props.accessibilityLabel);
    expect(labels.slice(0, 3)).toEqual(['Mango', 'Avocado', 'Banana']);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Mango' }));
    expect(checked('Mango')).toBe(true);
    expect(onDraft.mock.calls.at(-1)![0].details.foods).toEqual(['Mango']);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Mango' }));
    expect(onDraft.mock.calls.at(-1)![0].details.foods).toEqual([]);
  });

  it('adds a typed food and shows it as a first try', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} history={[earlier]} />);
    await fireEvent.changeText(screen.getByLabelText('Add a food'), '  scrambled   egg ');
    await fireEvent(screen.getByLabelText('Add a food'), 'submitEditing');
    expect(onDraft.mock.calls.at(-1)![0].details.foods).toEqual(['scrambled egg']);
    expect(checked('scrambled egg')).toBe(true);
    expect(screen.getByText('First try: scrambled egg')).toBeTruthy();
  });

  it('picks how much and the reaction, and can clear them', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Some' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Loved it' }));
    expect(onDraft.mock.calls.at(-1)![0].details).toMatchObject({ amount: 'some', reaction: 'loved' });
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Loved it' }));
    expect(onDraft.mock.calls.at(-1)![0].details.reaction).toBeNull();
  });

  it('shows the foods error', async () => {
    await render(<Harness onDraft={jest.fn()} errors={{ foods: 'Add at least one food.' }} />);
    expect(screen.getByText('Add at least one food.')).toBeTruthy();
  });
});
