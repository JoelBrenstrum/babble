import { dayLayout } from '@babble/domain';
import { sampleBaby, sampleEvents } from '@babble/api/fixtures';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { DayTimeline } from './day-timeline';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('DayTimeline', () => {
  it('opens an entry when its block is pressed', async () => {
    const now = new Date();
    const events = sampleEvents(now);
    const window = { start: new Date(now.getTime() - 24 * 3_600_000), end: now };
    const layout = dayLayout(events, window, now);
    const sleep = layout.sleep.find((item) => !item.running)!;

    await render(
      <DayTimeline layout={layout} ticks={[]} timeZone={sampleBaby.timezone} units="metric" nowFrac={null} now={now} />,
    );
    await fireEvent.press(screen.getAllByRole('button', { name: /^Sleep / })[layout.sleep.indexOf(sleep)]!);
    expect(router.push).toHaveBeenCalledWith(`/events/${sleep.event.id}`);
  });

  it('shows a summary on a long press and hides it when tapped', async () => {
    const now = new Date();
    const events = sampleEvents(now);
    const window = { start: new Date(now.getTime() - 24 * 3_600_000), end: now };
    const layout = dayLayout(events, window, now);
    const sleep = layout.sleep.find((item) => !item.running)!;

    await render(
      <DayTimeline layout={layout} ticks={[]} timeZone={sampleBaby.timezone} units="metric" nowFrac={null} now={now} />,
    );
    await fireEvent(screen.getAllByRole('button', { name: /^Sleep / })[layout.sleep.indexOf(sleep)]!, 'longPress');
    expect(screen.getByTestId('timeline-tip')).toBeTruthy();
    expect(screen.getByText(/^\d{1,2}:\d{2} [ap]m – \d{1,2}:\d{2} [ap]m · /)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('timeline-tip'));
    expect(screen.queryByTestId('timeline-tip')).toBeNull();
  });

  it('draws predicted blocks with their likely times', async () => {
    const now = new Date();
    const window = { start: new Date(now.getTime() - 12 * 3_600_000), end: new Date(now.getTime() + 12 * 3_600_000) };
    const predicted = {
      sleep: [
        {
          kind: 'sleep' as const,
          startFrac: 0.55,
          endFrac: 0.6,
          opacity: 0.8,
          label: 'Likely asleep 2:10 pm–3:20 pm',
          band: { startFrac: 0.54, endFrac: 0.57 },
          tip: { title: 'Likely sleep', lines: ['2:10 pm – 3:20 pm · 1h 10m', 'Could start 2:00 pm – 2:30 pm'] },
        },
      ],
      feeds: [],
    };

    await render(
      <DayTimeline
        layout={dayLayout([], window, now)}
        ticks={[]}
        timeZone={sampleBaby.timezone}
        units="metric"
        nowFrac={0.5}
        now={now}
        predicted={predicted}
      />,
    );
    expect(screen.getByLabelText('Likely asleep 2:10 pm–3:20 pm')).toBeTruthy();
    expect(screen.getByTestId('predicted-band')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Likely asleep 2:10 pm–3:20 pm'));
    expect(screen.getByText('Could start 2:00 pm – 2:30 pm')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('timeline-tip'));
    expect(screen.queryByTestId('timeline-tip')).toBeNull();
  });

  it('draws minor hours as unlabelled lines', async () => {
    const now = new Date();
    const window = { start: new Date(now.getTime() - 12 * 3_600_000), end: new Date(now.getTime() + 12 * 3_600_000) };
    await render(
      <DayTimeline
        layout={dayLayout([], window, now)}
        ticks={[
          { frac: 0, label: '00' },
          { frac: 1 / 24, label: '01', minor: true },
          { frac: 3 / 24, label: '03' },
        ]}
        timeZone={sampleBaby.timezone}
        units="metric"
        nowFrac={null}
        now={now}
      />,
    );
    expect(screen.getByText('03')).toBeTruthy();
    expect(screen.queryByText('01')).toBeNull();
    expect(screen.getAllByTestId('hour-line')).toHaveLength(1);
  });

  it('marks when the next feed is due', async () => {
    const now = new Date();
    const window = { start: new Date(now.getTime() - 12 * 3_600_000), end: new Date(now.getTime() + 12 * 3_600_000) };
    await render(
      <DayTimeline
        layout={dayLayout([], window, now)}
        ticks={[]}
        timeZone={sampleBaby.timezone}
        units="metric"
        nowFrac={0.5}
        now={now}
        feedDue={{ frac: 0.6, label: 'Feed due 3:10 pm', overdue: false }}
      />,
    );
    expect(screen.getByLabelText('Feed due 3:10 pm')).toBeOnTheScreen();
    expect(screen.getByText('Feed due 3:10 pm')).toBeOnTheScreen();
  });

  it('marks when the night starts', async () => {
    const now = new Date();
    const window = { start: new Date(now.getTime() - 12 * 3_600_000), end: new Date(now.getTime() + 12 * 3_600_000) };
    await render(
      <DayTimeline
        layout={dayLayout([], window, now)}
        ticks={[]}
        timeZone={sampleBaby.timezone}
        units="metric"
        nowFrac={0.5}
        now={now}
        night={[{ frac: 0.8, label: 'Night starts 7:00 pm' }]}
      />,
    );
    expect(screen.getByLabelText('Night starts 7:00 pm')).toBeTruthy();
    expect(screen.getByText('Night starts 7:00 pm')).toBeTruthy();
  });
});
