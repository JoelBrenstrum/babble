import { emptyDraft, type DraftOfType } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react';
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
  it('shows the live duration while the range is valid', () => {
    render(<Harness />);
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('1h 12m')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Woke up'), { target: { value: '2026-10-06T03:40' } });
    expect(screen.getByText('1h 42m')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Woke up'), { target: { value: '2026-10-06T01:00' } });
    expect(screen.queryByText('Duration')).not.toBeInTheDocument();
  });

  it('adds wake-ups, trims them a minute at a time and removes them', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a wake-up' }));
    expect(screen.getByText('Awake')).toBeInTheDocument();
    expect(screen.getByText('awake 10m 00s')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Take a minute off wake-up 1' }));
    expect(screen.getByText('awake 9m 00s')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove wake-up 1' }));
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove wake-up 1' })).toBeNull();
  });
});
