import { fireEvent, render, screen } from '@testing-library/react-native';
import { SegmentEditor } from './segment-editor';
import { SessionBreakdown } from './session-breakdown';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const at = (minutes: number, seconds = 0) => new Date(Date.UTC(2026, 9, 6, 10, minutes, seconds)).toISOString();
const segments = [
  { side: 'left' as const, startedAt: at(0), endedAt: at(10, 32) },
  { side: 'right' as const, startedAt: at(13, 34), endedAt: at(25, 57) },
];

describe('SessionBreakdown idle trim', () => {
  it('offers a minus on the idle before the current side', async () => {
    const onTrimIdle = jest.fn();
    await render(
      <SessionBreakdown
        segments={[
          { side: 'left', startedAt: at(0), endedAt: at(10) },
          { side: 'right', startedAt: at(16), endedAt: null },
        ]}
        mergeGapMs={15_000}
        now={new Date(at(20))}
        onTrimIdle={onTrimIdle}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Take a minute off the idle time' }));
    expect(onTrimIdle).toHaveBeenCalledTimes(1);
  });
});

describe('SessionBreakdown', () => {
  it('shows sides, idle downtime and totals', async () => {
    await render(<SessionBreakdown segments={segments} mergeGapMs={15_000} now={new Date(at(30))} />);
    expect(screen.getByText('Downtime')).toBeTruthy();
    expect(screen.getByText('idle')).toBeTruthy();
    expect(screen.getByText('3m 02s')).toBeTruthy();
    expect(screen.getByText('lost 3m 02s')).toBeTruthy();
  });

  it('marks the growing idle row while paused', async () => {
    await render(<SessionBreakdown segments={segments} mergeGapMs={15_000} now={new Date(at(27, 9))} paused />);
    expect(screen.getByText('idle · counting')).toBeTruthy();
    expect(screen.getByText('1m 12s')).toBeTruthy();
  });
});

describe('SegmentEditor', () => {
  it('recomputes timestamps when a downtime changes', async () => {
    const onChange = jest.fn();
    await render(<SegmentEditor startedAt={at(0)} segments={segments} onChange={onChange} />);
    await fireEvent.changeText(screen.getByLabelText('Downtime 2 minutes'), '5');
    const next = onChange.mock.calls.at(-1)![0];
    expect(next.segments[1].startedAt).toBe(at(15, 34));
  });
});
