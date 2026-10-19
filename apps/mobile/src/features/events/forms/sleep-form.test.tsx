import { emptyDraft } from '@babble/domain';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import type { DraftOfType } from '@babble/domain';
import { SleepForm } from './sleep-form';

const base = emptyDraft('sleep', new Date('2026-10-06T10:00:00Z'));

function Harness({ onDraft }: { onDraft?: (draft: DraftOfType<'sleep'>) => void }) {
  const [draft, setDraft] = useState<DraftOfType<'sleep'>>({
    ...base,
    startedAt: '2026-10-05T12:58:00Z',
    endedAt: '2026-10-05T14:10:00Z',
  });
  return (
    <SleepForm
      draft={draft}
      onChange={(next) => {
        setDraft(next);
        onDraft?.(next);
      }}
      errors={{}}
      timeZone="Pacific/Auckland"
      units="metric"
      isNew
    />
  );
}

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
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add a wake-up' }));
    expect(screen.getByText('awake 10m 00s')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Take a minute off wake-up 1' }));
    expect(screen.getByText('awake 9m 00s')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove wake-up 1' }));
    expect(screen.getByText('Duration')).toBeTruthy();
  });

  it('rates sleep quality and clears it on a second tap', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} />);
    const five = screen.getByRole('radio', { name: '5: Deep and settled' });
    expect(five.props.accessibilityState.checked).toBe(false);

    await fireEvent.press(five);
    expect(onDraft.mock.calls.at(-1)![0].details.quality).toBe(5);
    expect(screen.getByText('Deep and settled')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: '5: Deep and settled' }));
    expect(onDraft.mock.calls.at(-1)![0].details.quality).toBeNull();
  });
});
