import type { BabbleClient } from '@babble/api';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SessionMerge } from '@babble/domain';
import { LiveMergeOffer, MergeSessionsRow } from './merge-sessions';

const mockMerge = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('@babble/api/react', () => ({
  ...jest.requireActual('@babble/api/react'),
  useMergeSessions: () => ({ mutateAsync: (...args: unknown[]) => mockMerge(...args) }),
}));

const client = {} as BabbleClient;
const merge: SessionMerge = { type: 'breast_feed', earlierId: 'feed-1', laterId: 'feed-2', gapMs: 12 * 60_000 };
const naps: SessionMerge = { type: 'sleep', earlierId: 'nap-1', laterId: 'nap-2', gapMs: 12 * 60_000 };

afterEach(() => jest.clearAllMocks());

describe('MergeSessionsRow', () => {
  it('shows the gap and merges after confirming', async () => {
    await render(<MergeSessionsRow client={client} babyId="baby-1" merge={merge} />);
    expect(screen.getByText('12m apart')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Merge'));
    expect(mockMerge).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Merge'));
    expect(mockMerge).toHaveBeenCalledWith(merge);
  });

  it('merges two sleeps', async () => {
    await render(<MergeSessionsRow client={client} babyId="baby-1" merge={naps} />);
    await fireEvent.press(screen.getByLabelText('Merge'));
    expect(screen.getByLabelText('Merge sleeps')).toBeTruthy();
    await fireEvent.press(screen.getByText('Merge'));
    expect(mockMerge).toHaveBeenCalledWith(naps);
  });

  it('can be cancelled', async () => {
    await render(<MergeSessionsRow client={client} babyId="baby-1" merge={merge} />);
    await fireEvent.press(screen.getByLabelText('Merge'));
    await fireEvent.press(screen.getByText('Cancel'));
    expect(screen.getByText('12m apart')).toBeTruthy();
    expect(mockMerge).not.toHaveBeenCalled();
  });
});

describe('LiveMergeOffer', () => {
  it('merges the running feed into the last one and reports back', async () => {
    const onMerged = jest.fn();
    await render(
      <LiveMergeOffer client={client} babyId="baby-1" merge={{ ...merge, gapMs: 8 * 60_000 }} onMerged={onMerged} />,
    );
    expect(screen.getByText('Started 8m after the last feed')).toBeTruthy();
    await fireEvent.press(screen.getByText('Merge into it'));
    await fireEvent.press(screen.getByText('Merge'));
    expect(mockMerge).toHaveBeenCalledWith({ ...merge, gapMs: 8 * 60_000 });
    expect(onMerged).toHaveBeenCalled();
  });

  it('offers to merge a running sleep into the last sleep', async () => {
    await render(<LiveMergeOffer client={client} babyId="baby-1" merge={naps} onMerged={jest.fn()} />);
    expect(screen.getByText('Started 12m after the last sleep')).toBeTruthy();
  });
});
