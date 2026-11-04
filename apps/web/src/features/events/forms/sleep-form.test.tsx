import { emptyDraft, type DraftOfType } from '@babble/domain';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SleepForm } from './sleep-form';

function Harness() {
  const [draft, setDraft] = useState<DraftOfType<'sleep'>>({
    ...emptyDraft('sleep', new Date('2026-10-06T10:00:00Z')),
    startedAt: '2026-10-05T12:58:00Z',
    endedAt: '2026-10-05T14:10:00Z',
  });
  return <SleepForm draft={draft} onChange={setDraft} errors={{}} timeZone="Pacific/Auckland" units="metric" isNew />;
}

describe('SleepForm', () => {
  it('edits the nap length from the sleep row and keeps the wake-up time in step', () => {
    render(<Harness />);
    expect(screen.getByText('1h 12m')).toBeInTheDocument();
    expect(screen.getByLabelText('Sleep 1 hours')).toHaveValue('1');
    expect(screen.getByLabelText('Sleep 1 minutes')).toHaveValue('12');

    fireEvent.change(screen.getByLabelText('Sleep 1 minutes'), { target: { value: '40' } });
    expect(screen.getByText('1h 40m')).toBeInTheDocument();
    expect(screen.getByLabelText('Woke up')).toHaveValue('2026-10-06T03:38');

    fireEvent.change(screen.getByLabelText('Woke up'), { target: { value: '2026-10-06T03:40' } });
    expect(screen.getByLabelText('Sleep 1 minutes')).toHaveValue('42');
  });

  it('rates sleep quality from 1 to 5 and clears it on a second tap', () => {
    render(<Harness />);
    const group = screen.getByRole('radiogroup', { name: 'Sleep quality' });
    expect(within(group).getAllByRole('radio')).toHaveLength(5);
    expect(screen.queryByText('Settled')).toBeNull();

    fireEvent.click(within(group).getByRole('radio', { name: '4: Settled' }));
    expect(within(group).getByRole('radio', { name: '4: Settled' })).toBeChecked();
    expect(screen.getByText('Settled')).toBeInTheDocument();

    fireEvent.click(within(group).getByRole('radio', { name: '1: Hard to settle, wakeful' }));
    expect(within(group).getByRole('radio', { name: '4: Settled' })).not.toBeChecked();
    expect(within(group).getByRole('radio', { name: '1: Hard to settle, wakeful' })).toBeChecked();

    fireEvent.click(within(group).getByRole('radio', { name: '1: Hard to settle, wakeful' }));
    expect(within(group).getByRole('radio', { name: '1: Hard to settle, wakeful' })).not.toBeChecked();
  });

  it('adds wake-ups, edits how long each lasted and removes them', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a wake-up' }));
    expect(screen.getByText('Awake')).toBeInTheDocument();
    expect(screen.getByText('awake 10m')).toBeInTheDocument();
    expect(screen.getByText('1h 02m')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Wake-up 1 minutes'), { target: { value: '25' } });
    expect(screen.getByText('awake 25m')).toBeInTheDocument();
    expect(screen.getByLabelText('Woke up')).toHaveValue('2026-10-06T03:25');

    fireEvent.click(screen.getByRole('button', { name: 'Remove wake-up 1' }));
    expect(screen.queryByText('Awake')).toBeNull();
    expect(screen.getByText('1h 27m')).toBeInTheDocument();
    expect(screen.getByLabelText('Woke up')).toHaveValue('2026-10-06T03:25');
  });
});
