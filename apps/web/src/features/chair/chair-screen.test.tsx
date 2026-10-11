import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChairScreen, type ChairActions, type ChairData, type ChairFeed } from './chair-screen';

const feed: ChairFeed = {
  id: 'feed-1',
  view: {
    paused: false,
    side: 'left',
    title: 'Feeding · Left',
    timer: '12:34',
    sides: 'Left 8:10 · Right 4:24',
    pausedFor: null,
    idle: null,
  },
  summary: { title: 'Fed 13m', sides: 'Left 8m · Right 4m' },
  startedLine: 'Started 2:41 pm by Jane',
  startedBy: 'Jane',
};

function makeData(overrides: Partial<ChairData> = {}): ChairData {
  return {
    babyName: 'Olivia',
    age: '11 days',
    clock: '2:20 pm',
    night: false,
    dimmed: false,
    updateReady: false,
    offline: false,
    lastFeed: 'Last fed 2h 10m ago · Right side · 18m',
    due: { text: 'Next feed due in 42m · around 3:02 pm', overdue: false },
    suggested: 'left',
    feed: null,
    nap: null,
    lastNappy: null,
    nappyDue: false,
    units: 'metric',
    bottle: { amount: 120, content: 'breast_milk' },
    ...overrides,
  };
}

function makeActions(): ChairActions {
  return {
    startFeed: vi.fn(async () => undefined),
    switchSide: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    endFeed: vi.fn(async () => undefined),
    resumeFeed: vi.fn(async () => undefined),
    saveBottle: vi.fn(async () => 'bottle-1'),
    saveNappy: vi.fn(async () => 'nappy-1'),
    startNap: vi.fn(async () => 'nap-1'),
    endNap: vi.fn(async () => undefined),
    undoEntry: vi.fn(async () => undefined),
    restoreEntry: vi.fn(async () => undefined),
    wake: vi.fn(),
    dimNow: vi.fn(),
    refresh: vi.fn(),
  };
}

const tap = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const flush = () => act(async () => undefined);

afterEach(() => vi.useRealTimers());

describe('ChairScreen idle', () => {
  it('shows the last feed, due time and suggested side, and starts a feed', () => {
    const actions = makeActions();
    render(<ChairScreen data={makeData()} actions={actions} />);
    expect(screen.getByText('Last fed 2h 10m ago · Right side · 18m')).toBeInTheDocument();
    expect(screen.getByText('Next feed due in 42m · around 3:02 pm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start left' })).toHaveTextContent('Next');
    expect(screen.getByRole('button', { name: 'Start right' })).not.toHaveTextContent('Next');
    tap('Start right');
    expect(actions.startFeed).toHaveBeenCalledWith('right');
  });

  it('asks about a nappy once the feed has started, when none was logged recently', async () => {
    const actions = makeActions();
    const { rerender } = render(<ChairScreen data={makeData({ nappyDue: true })} actions={actions} />);
    tap('Start left');
    await flush();
    rerender(<ChairScreen data={makeData({ feed, nappyDue: true })} actions={actions} />);
    expect(screen.getByRole('dialog', { name: "Change Olivia's nappy?" })).toBeInTheDocument();
    tap('Yes, log a nappy');
    tap('Dirty');
    await flush();
    expect(actions.saveNappy).toHaveBeenCalledWith('dirty');
    expect(screen.getByRole('timer')).toHaveTextContent('12:34');
  });

  it('can skip the nappy question, and does not ask when a nappy was just logged', async () => {
    const actions = makeActions();
    const { unmount } = render(<ChairScreen data={makeData({ nappyDue: true })} actions={actions} />);
    tap('Start left');
    await flush();
    tap('Not now');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();

    render(<ChairScreen data={makeData()} actions={actions} />);
    tap('Start left');
    await flush();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('logs a bottle with the stepper and offers Undo', async () => {
    const actions = makeActions();
    render(<ChairScreen data={makeData()} actions={actions} />);
    tap(/Bottle/);
    const dialog = screen.getByRole('dialog', { name: 'Bottle' });
    tap('More, 10 ml');
    tap('More, 10 ml');
    tap('Less, 10 ml');
    fireEvent.click(screen.getByRole('radio', { name: 'Formula' }));
    expect(dialog).toHaveTextContent('130ml');
    tap('Save');
    await flush();
    expect(actions.saveBottle).toHaveBeenCalledWith(130, 'formula');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Bottle saved · 130 ml');
    tap('Undo');
    await flush();
    expect(actions.undoEntry).toHaveBeenCalledWith('bottle-1');
  });

  it('saves a nappy in one tap', async () => {
    const actions = makeActions();
    render(<ChairScreen data={makeData({ lastNappy: 'Wet · 2h 10m ago' })} actions={actions} />);
    expect(screen.getByRole('button', { name: /^Nappy/ })).toHaveTextContent('Wet · 2h 10m ago');
    tap(/Nappy/);
    tap('Both');
    await flush();
    expect(actions.saveNappy).toHaveBeenCalledWith('both');
    expect(screen.getByRole('status')).toHaveTextContent('Nappy saved · Wet and dirty');
  });

  it('starts a nap, or ends the running one', async () => {
    const actions = makeActions();
    const { rerender } = render(<ChairScreen data={makeData()} actions={actions} />);
    tap('Sleep');
    await flush();
    expect(actions.startNap).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Nap started');
    rerender(<ChairScreen data={makeData({ nap: '32m' })} actions={actions} />);
    tap('End nap · 32m');
    await flush();
    expect(actions.endNap).toHaveBeenCalled();
  });

  it('shows a failed save', async () => {
    const actions = makeActions();
    actions.saveNappy = vi.fn(async () => {
      throw new Error('No connection.');
    });
    render(<ChairScreen data={makeData()} actions={actions} />);
    tap(/Nappy/);
    tap('Wet');
    await flush();
    expect(screen.getByRole('status')).toHaveTextContent('No connection.');
  });
});

describe('ChairScreen feeding', () => {
  it('switches, pauses and shows who started it', () => {
    const actions = makeActions();
    render(<ChairScreen data={makeData({ feed })} actions={actions} />);
    expect(screen.getByRole('timer')).toHaveTextContent('12:34');
    expect(screen.getByText('Started 2:41 pm by Jane')).toBeInTheDocument();
    tap('Switch to Right');
    expect(actions.switchSide).toHaveBeenCalledWith('right');
    tap('Pause');
    expect(actions.pause).toHaveBeenCalled();
  });

  it('discards a running feed with an Undo that brings it back', async () => {
    const actions = makeActions();
    render(<ChairScreen data={makeData({ feed })} actions={actions} />);
    tap('Discard');
    await flush();
    expect(actions.undoEntry).toHaveBeenCalledWith('feed-1');
    expect(screen.getByRole('status')).toHaveTextContent('Feed discarded');
    tap('Undo');
    await flush();
    expect(actions.restoreEntry).toHaveBeenCalledWith('feed-1');
  });

  it('shows idle time once there is some', () => {
    render(
      <ChairScreen
        data={makeData({ feed: { ...feed, view: { ...feed.view, idle: 'Idle 1:12' } } })}
        actions={makeActions()}
      />,
    );
    expect(screen.getByText('Idle 1:12')).toBeInTheDocument();
  });

  it('resumes a paused feed on the same side', () => {
    const actions = makeActions();
    const paused = { ...feed, view: { ...feed.view, paused: true, title: 'Paused · Left', pausedFor: 'Paused 3m' } };
    render(<ChairScreen data={makeData({ feed: paused })} actions={actions} />);
    expect(screen.getByText('Paused 3m')).toBeInTheDocument();
    tap('Resume');
    expect(actions.resume).toHaveBeenCalledWith('left');
  });

  it('shows the summary after ending, then returns to idle', async () => {
    vi.useFakeTimers();
    const actions = makeActions();
    const { rerender } = render(<ChairScreen data={makeData({ feed })} actions={actions} />);
    tap('End feed');
    rerender(<ChairScreen data={makeData()} actions={actions} />);
    expect(actions.endFeed).toHaveBeenCalled();
    expect(screen.getByText('Fed 13m')).toBeInTheDocument();
    expect(screen.getByText('Left 8m · Right 4m')).toBeInTheDocument();
    expect(screen.getByText('Back to the start screen in 30s')).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(5_000));
    expect(screen.getByText('Back to the start screen in 25s')).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(25_000));
    expect(screen.queryByText('Fed 13m')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start left' })).toBeInTheDocument();
  });

  it('undoes an ended feed or starts a nap', async () => {
    const actions = makeActions();
    const { rerender } = render(<ChairScreen data={makeData({ feed })} actions={actions} />);
    tap('End feed');
    rerender(<ChairScreen data={makeData()} actions={actions} />);
    tap('Undo');
    await flush();
    expect(actions.resumeFeed).toHaveBeenCalledWith('feed-1');

    rerender(<ChairScreen data={makeData({ feed })} actions={actions} />);
    tap('End feed');
    tap("Olivia's asleep");
    await flush();
    expect(actions.startNap).toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Nap started');
  });

  it('does not offer a nap when one is already running', () => {
    const actions = makeActions();
    render(<ChairScreen data={makeData({ feed, nap: '10m' })} actions={actions} />);
    tap('End feed');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /asleep/ })).not.toBeInTheDocument();
  });
});

describe('ChairScreen night and offline', () => {
  it('swallows the first tap while dimmed', () => {
    const actions = makeActions();
    render(<ChairScreen data={makeData({ dimmed: true, night: true })} actions={actions} />);
    expect(screen.getByText('Dimmed · tap to wake')).toBeInTheDocument();
    expect(screen.getByTestId('chair')).toHaveClass('chair-dim');
    expect(screen.getByTestId('chair')).toHaveAttribute('data-theme', 'dark');
    const left = screen.getByRole('button', { name: 'Start left' });
    fireEvent.pointerDown(left);
    fireEvent.click(left);
    expect(actions.wake).toHaveBeenCalled();
    expect(actions.startFeed).not.toHaveBeenCalled();
  });

  it('dims on request, and hides the button while dimmed', () => {
    const actions = makeActions();
    const { rerender } = render(<ChairScreen data={makeData()} actions={actions} />);
    tap('Dim now');
    expect(actions.dimNow).toHaveBeenCalled();
    rerender(<ChairScreen data={makeData({ dimmed: true })} actions={actions} />);
    expect(screen.queryByRole('button', { name: 'Dim now' })).not.toBeInTheDocument();
  });

  it('acts on taps when awake', () => {
    const actions = makeActions();
    render(<ChairScreen data={makeData()} actions={actions} />);
    const left = screen.getByRole('button', { name: 'Start left' });
    fireEvent.pointerDown(left);
    fireEvent.click(left);
    expect(actions.startFeed).toHaveBeenCalledWith('left');
  });

  it('offers a refresh when a new version is out', () => {
    const actions = makeActions();
    render(<ChairScreen data={makeData({ updateReady: true })} actions={actions} />);
    expect(screen.getByRole('status')).toHaveTextContent('A new version of babble is ready');
    tap('Refresh');
    expect(actions.refresh).toHaveBeenCalled();
  });

  it('shows the offline screen', () => {
    render(<ChairScreen data={makeData({ offline: true })} actions={makeActions()} />);
    expect(screen.getByText("Can't reach babble.")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start left' })).not.toBeInTheDocument();
  });
});
