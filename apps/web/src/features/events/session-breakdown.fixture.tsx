import { SessionBreakdown } from './session-breakdown';

const now = new Date();
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

export default {
  Finished: (
    <SessionBreakdown
      segments={[
        { side: 'left', startedAt: minutesAgo(30), endedAt: minutesAgo(19.5) },
        { side: 'right', startedAt: minutesAgo(16.4), endedAt: minutesAgo(4) },
      ]}
      mergeGapMs={15_000}
      now={now}
    />
  ),
  Paused: (
    <SessionBreakdown
      segments={[{ side: 'left', startedAt: minutesAgo(12), endedAt: minutesAgo(3) }]}
      mergeGapMs={15_000}
      now={now}
      paused
    />
  ),
};
