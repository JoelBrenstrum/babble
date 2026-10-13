import type { NappyType } from '@babble/domain';
import { Droplet, Droplets, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '#/lib/cn';
import { BigButton } from './big-button';
import { Sheet } from './sheet';
import { OUTLINED } from './styles';

const NAPPIES: { value: NappyType; label: string; icon: LucideIcon | null; poo: boolean }[] = [
  { value: 'wet', label: 'Wet', icon: Droplet, poo: false },
  { value: 'dirty', label: 'Dirty', icon: null, poo: true },
  { value: 'both', label: 'Both', icon: Droplet, poo: true },
  { value: 'dry', label: 'Dry', icon: Sun, poo: false },
];

export const NAPPY_SAVED: Record<NappyType, string> = {
  wet: 'Wet',
  dirty: 'Dirty',
  both: 'Wet and dirty',
  dry: 'Dry',
};

export function NappySheet({ onClose, onPick }: { onClose: () => void; onPick: (type: NappyType) => void }) {
  return (
    <Sheet title="Nappy" icon={Droplets} tone="bg-nappy-soft text-nappy" onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-wrap content-stretch gap-[3cqmin]">
        {NAPPIES.map((option) => (
          <BigButton
            key={option.value}
            onClick={() => onPick(option.value)}
            className="min-h-[28cqmin] flex-[1_1_34cqmin] flex-col rounded-[5cqmin] bg-nappy-soft text-on-nappy"
          >
            <span className="flex h-[11cqmin] items-center gap-[1.4cqmin]">
              {option.icon && <option.icon className="size-[10cqmin] text-nappy" strokeWidth={2.5} />}
              {option.poo && (
                <span className="size-[9cqmin] rounded-full bg-poo-mustard shadow-[inset_0_0_0_0.5cqmin_rgb(var(--swatch-edge)/0.6)]" />
              )}
            </span>
            <span className="text-[length:7cqmin]">{option.label}</span>
          </BigButton>
        ))}
      </div>
    </Sheet>
  );
}

export function NappyAskSheet({
  babyName,
  onClose,
  onYes,
}: {
  babyName: string;
  onClose: () => void;
  onYes: () => void;
}) {
  return (
    <Sheet title={`Change ${babyName}'s nappy?`} icon={Droplets} tone="bg-nappy-soft text-nappy" onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-wrap content-end gap-[3cqmin] text-[length:6cqmin]">
        <BigButton onClick={onClose} className={cn('h-[24cqmin] flex-[1_1_30cqmin] rounded-[5cqmin]', OUTLINED)}>
          Not now
        </BigButton>
        <BigButton
          onClick={onYes}
          className="h-[24cqmin] flex-[2_1_50cqmin] rounded-[5cqmin] bg-nappy text-ink-on-solid"
        >
          <Droplets className="size-[6.4cqmin]" strokeWidth={2.75} />
          Yes, log a nappy
        </BigButton>
      </div>
    </Sheet>
  );
}
