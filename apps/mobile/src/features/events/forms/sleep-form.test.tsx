import { emptyDraft } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import type { DraftOfType } from '@babble/domain';
import { SleepForm } from './sleep-form';

const base = emptyDraft('sleep', new Date('2026-10-06T10:00:00Z'));

describe('SleepForm', () => {
  it('shows the duration when the range is valid', async () => {
    const draft = { ...base, startedAt: '2026-10-05T12:58:00Z', endedAt: '2026-10-05T14:10:00Z' };
    await render(
      <SleepForm draft={draft} onChange={jest.fn()} errors={{}} timeZone="Pacific/Auckland" units="metric" isNew />,
    );
    expect(screen.getByText('Duration')).toBeTruthy();
    expect(screen.getByText('1h 12m')).toBeTruthy();
  });

  it('hides the duration when the end is before the start', async () => {
    const draft = { ...base, startedAt: '2026-10-05T14:10:00Z', endedAt: '2026-10-05T12:58:00Z' };
    await render(
      <SleepForm draft={draft} onChange={jest.fn()} errors={{}} timeZone="Pacific/Auckland" units="metric" isNew />,
    );
    expect(screen.queryByText('Duration')).toBeNull();
  });

  it('adds wake-ups, trims them a minute at a time and removes them', async () => {
    function Harness() {
      const [draft, setDraft] = useState<DraftOfType<'sleep'>>({
        ...base,
        startedAt: '2026-10-05T12:58:00Z',
        endedAt: '2026-10-05T14:10:00Z',
      });
      return (
        <SleepForm draft={draft} onChange={setDraft} errors={{}} timeZone="Pacific/Auckland" units="metric" isNew />
      );
    }
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add a wake-up' }));
    expect(screen.getByText('awake 10m 00s')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Take a minute off wake-up 1' }));
    expect(screen.getByText('awake 9m 00s')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove wake-up 1' }));
    expect(screen.getByText('Duration')).toBeTruthy();
  });
});
