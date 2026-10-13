import { Check, Moon, Undo2 } from 'lucide-react';
import { cn } from '#/lib/cn';
import { BigButton } from './big-button';
import { ACTION_BUTTON, ACTION_ICON, ACTION_ROW, OUTLINED } from './styles';

export interface EndedFeed {
  id: string;
  title: string;
  sides: string;
  until: number;
}

export function EndedView({
  ended,
  secondsLeft: remaining,
  babyName,
  onUndo,
  onAsleep,
}: {
  ended: EndedFeed;
  secondsLeft: number;
  babyName: string;
  onUndo: () => void;
  onAsleep: (() => void) | null;
}) {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center gap-[2.4cqmin] text-center">
        <span className="grid size-[20cqmin] place-items-center rounded-full bg-success text-ink-on-solid">
          <Check className="size-[11cqmin]" strokeWidth={2.75} />
        </span>
        <span className="tabular text-[length:13cqmin] leading-none font-bold">{ended.title}</span>
        {ended.sides && <span className="tabular text-[length:6cqmin] font-semibold text-ink-2">{ended.sides}</span>}
      </div>
      <div className={ACTION_ROW}>
        <BigButton onClick={onUndo} className={cn(ACTION_BUTTON, OUTLINED, 'flex-[1_1_30cqmin]')}>
          <Undo2 className={ACTION_ICON} strokeWidth={2.75} />
          Undo
        </BigButton>
        {onAsleep && (
          <BigButton
            onClick={onAsleep}
            className={cn(ACTION_BUTTON, 'flex-[2_1_50cqmin] bg-sleep text-[length:5.8cqmin] text-ink-on-solid')}
          >
            <Moon className="size-[6.4cqmin]" strokeWidth={2.75} />
            {babyName}'s asleep
          </BigButton>
        )}
      </div>
      <span className="flex-none self-center text-[length:3.8cqmin] text-ink-2">{`Back to the start screen in ${remaining}s`}</span>
    </>
  );
}
