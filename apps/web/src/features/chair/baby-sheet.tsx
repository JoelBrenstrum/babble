import type { ChairBaby } from '@babble/domain';
import { Baby, Check, LogOut } from 'lucide-react';
import { cn } from '#/lib/cn';
import { BigButton } from './big-button';
import { Sheet } from './sheet';

export function BabySheet({
  babies,
  onClose,
  onPick,
}: {
  babies: readonly ChairBaby[];
  onClose: () => void;
  onPick: (baby: ChairBaby) => void;
}) {
  return (
    <Sheet title="Switch baby" icon={Baby} tone="bg-primary-soft text-on-primary-soft" onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-col gap-[3cqmin] overflow-y-auto">
        {babies.map((baby) => (
          <BigButton
            key={baby.id}
            label={baby.name}
            onClick={() => onPick(baby)}
            className={cn(
              'min-h-[20cqmin] flex-none justify-start rounded-[5cqmin] px-[5cqmin] text-left',
              baby.selected ? 'bg-primary-soft text-on-primary-soft' : 'border-[0.5cqmin] border-line-strong bg-raised',
            )}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[length:7cqmin]">{baby.name}</span>
              <span className="text-[length:4cqmin] font-semibold text-ink-2">{baby.detail}</span>
            </span>
            {baby.selected && <Check className="size-[7cqmin] flex-none" strokeWidth={3} />}
          </BigButton>
        ))}
        <a
          href="/"
          className="mt-auto flex min-h-[16cqmin] flex-none items-center justify-center gap-[2cqmin] rounded-[5cqmin] bg-surface text-[length:5cqmin] font-bold text-ink-2"
        >
          <LogOut className="size-[5cqmin]" strokeWidth={2.75} />
          Leave chair mode
        </a>
      </div>
    </Sheet>
  );
}
