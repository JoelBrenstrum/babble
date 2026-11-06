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
  it('shows the nap length as an editable sleep row', async () => {
    await render(<Harness />);
    expect(screen.getByText('1h 12m')).toBeTruthy();
    expect(screen.getByLabelText('Sleep 1 hours').props.value).toBe('1');
    expect(screen.getByLabelText('Sleep 1 minutes').props.value).toBe('12');
  });

  it('moves the wake-up time when the sleep row changes', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} />);
    await fireEvent.changeText(screen.getByLabelText('Sleep 1 minutes'), '40');
    expect(onDraft.mock.calls.at(-1)![0].endedAt).toBe('2026-10-05T14:38:00.000Z');
    expect(screen.getByText('1h 40m')).toBeTruthy();
  });

  it('adds wake-ups, edits how long each lasted and removes them', async () => {
    const onDraft = jest.fn();
    await render(<Harness onDraft={onDraft} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add a wake-up' }));
    expect(screen.getByText('awake 10m')).toBeTruthy();
    expect(onDraft.mock.calls.at(-1)![0].segments).toHaveLength(2);

    await fireEvent.changeText(screen.getByLabelText('Wake-up 1 minutes'), '25');
    expect(screen.getByText('awake 25m')).toBeTruthy();
    expect(onDraft.mock.calls.at(-1)![0].endedAt).toBe('2026-10-05T14:25:00.000Z');

    await fireEvent.press(screen.getByRole('button', { name: 'Remove wake-up 1' }));
    expect(screen.queryByText('Awake')).toBeNull();
    expect(onDraft.mock.calls.at(-1)![0]).toMatchObject({ segments: [], endedAt: '2026-10-05T14:25:00.000Z' });
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
