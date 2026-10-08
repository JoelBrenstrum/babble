import { emptyDraft, type DraftOfType } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { GrowthForm } from './growth-form';

const PREVIOUS = { weightG: 'Last: 4.8 kg · 3 Oct', lengthMm: null, headCircumferenceMm: null };

function Harness({ onDraft }: { onDraft: (draft: DraftOfType<'growth'>) => void }) {
  const [draft, setDraft] = useState(emptyDraft('growth', new Date('2026-10-06T10:00:00Z')));
  return (
    <GrowthForm
      draft={draft}
      onChange={(next) => {
        setDraft(next);
        onDraft(next);
      }}
      errors={{}}
      timeZone="Pacific/Auckland"
      units="metric"
      isNew
      previous={PREVIOUS}
    />
  );
}

describe('GrowthForm', () => {
  it('only accepts numbers and converts to metric storage units', async () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} />);
    const weight = screen.getByLabelText('Weight (kg)');
    await userEvent.type(weight, '3a.9x5kg');
    expect(weight).toHaveValue('3.95');
    expect(onDraft.mock.calls.at(-1)![0].details.weightG).toBe(3950);
  });

  it('clears a measurement when emptied', async () => {
    const onDraft = vi.fn();
    render(<Harness onDraft={onDraft} />);
    const length = screen.getByLabelText('Length (cm)');
    await userEvent.type(length, '51');
    await userEvent.clear(length);
    expect(onDraft.mock.calls.at(-1)![0].details.lengthMm).toBeNull();
  });

  it('shows the last measurement as a placeholder', () => {
    render(<Harness onDraft={vi.fn()} />);
    expect(screen.getByLabelText('Weight (kg)')).toHaveAttribute('placeholder', 'Last: 4.8 kg · 3 Oct');
    expect(screen.getByLabelText('Length (cm)')).not.toHaveAttribute('placeholder');
  });
});
