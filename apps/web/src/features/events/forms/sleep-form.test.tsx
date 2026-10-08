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
});
