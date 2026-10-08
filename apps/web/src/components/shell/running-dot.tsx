import type { RunningIndicator, Tracker } from '@babble/domain';
import { cn } from '#/lib/cn';

const DOT: Record<Tracker['token'], string> = {
  'feed-right': 'bg-feed-right',
  sleep: 'bg-sleep',
  nappy: 'bg-nappy',
  bottle: 'bg-bottle',
  pump: 'bg-pump',
  growth: 'bg-growth',
  custom: 'bg-custom',
};

export function RunningDot({ indicator, className }: { indicator: RunningIndicator; className?: string }) {
  const [first, second] = indicator.tokens;
  return (
    <span data-testid="running-dot" className={cn('pointer-events-none grid size-2.5 place-items-center', className)}>
      {indicator.pulsing && (
        <span
          data-pulse
          className={cn('col-start-1 row-start-1 size-2.5 animate-timer-pulse rounded-full', DOT[first!])}
        />
      )}
      <span className="col-start-1 row-start-1 flex size-2.5 overflow-hidden rounded-full ring-2 ring-raised">
        <span className={cn('h-full flex-1', DOT[first!])} />
        {second && <span className={cn('h-full flex-1', DOT[second])} />}
      </span>
    </span>
  );
}
