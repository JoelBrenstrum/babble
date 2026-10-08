import { emptyDraft } from '@babble/domain';
import { render, screen } from '@testing-library/react-native';
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
});
