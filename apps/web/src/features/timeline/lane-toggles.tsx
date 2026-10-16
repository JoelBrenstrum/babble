import { shownLanes, TIMELINE_LANE_LABELS, TIMELINE_LANES, toggleLane, type TimelineLane } from '@babble/domain';
import { cn } from '#/lib/cn';

const DOT: Record<TimelineLane, string> = {
  sleep: 'bg-sleep',
  feeds: 'bg-feed-left',
  nappies: 'bg-nappy',
  pumps: 'bg-pump',
};

export function LaneToggles({
  show,
  onChange,
}: {
  show: string | undefined;
  onChange: (show: string | undefined) => void;
}) {
  const shown = shownLanes(show);
  return (
    <div role="group" aria-label="Show on the timeline" className="flex flex-wrap gap-2">
      {TIMELINE_LANES.map((lane) => {
        const on = shown.includes(lane);
        return (
          <button
            key={lane}
            type="button"
            aria-pressed={on}
            disabled={on && shown.length === 1}
            onClick={() => onChange(toggleLane(show, lane))}
            className={cn(
              'h-10 inline-flex items-center gap-2 rounded-full border px-3 text-label font-semibold transition-colors duration-base disabled:cursor-default',
              on ? 'border-line-strong bg-raised text-ink' : 'border-line bg-surface text-ink-3 hover:text-ink-2',
            )}
          >
            <span className={cn('size-2.5 rounded-full', on ? DOT[lane] : 'bg-line-strong')} />
            {TIMELINE_LANE_LABELS[lane]}
          </button>
        );
      })}
    </div>
  );
}
