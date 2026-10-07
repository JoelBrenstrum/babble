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
});
