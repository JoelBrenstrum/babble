import { hourLabel, type ReportResult } from '@babble/domain';
import { cn } from '#/lib/cn';
import { toneLook } from '../tones';

const MARKS = [0, 6, 12, 18];

export function RhythmChart({ result, rows = 14 }: { result: ReportResult; rows?: number }) {
  const shown = result.rhythm?.slice(-rows) ?? [];
  return (
    <div className="flex flex-col gap-1">
      <div className="relative ml-12 h-4 text-caption text-ink-3">
        {MARKS.map((hour) => (
          <span key={hour} className="absolute" style={{ left: `${(hour / 24) * 100}%` }}>
            {hourLabel(hour)}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1" role="img" aria-label="Sleep, feeds and nappies as blocks, one row per day">
        {shown.map((row) => (
          <div key={row.dayKey} className="flex items-center gap-1">
            <span className="w-11 shrink-0 truncate text-caption tabular text-ink-3">
              {row.title.replace(/^\w+ /, '')}
            </span>
            <div className="relative h-4 flex-1 overflow-hidden rounded-[3px] bg-surface">
              {row.blocks.map((block, index) => {
                const look = toneLook(block.tone);
                const instant = block.end <= block.start;
                return (
                  <span
                    key={`${block.eventId}-${index}`}
                    className={cn('absolute inset-y-0', look.classes.bg, instant ? 'w-0.5' : 'rounded-[2px]')}
                    style={{
                      left: `${block.start * 100}%`,
                      width: instant ? undefined : `${Math.max(0.4, (block.end - block.start) * 100)}%`,
                      ...look.style,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
