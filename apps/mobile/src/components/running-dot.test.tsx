import { runningIndicator } from '@babble/domain';
import { sampleRunningFeed, sampleRunningSleep } from '@babble/api/fixtures';
import { render, screen } from '@testing-library/react-native';
import { RunningDot } from './running-dot';

const now = new Date('2026-10-06T10:00:00Z');

describe('RunningDot', () => {
  it('splits the dot between two running trackers', async () => {
    await render(<RunningDot indicator={runningIndicator([sampleRunningFeed(now), sampleRunningSleep(now)])!} />);
    expect(screen.getByTestId('running-dot-feed-right')).toBeTruthy();
    expect(screen.getByTestId('running-dot-sleep')).toBeTruthy();
  });
});
