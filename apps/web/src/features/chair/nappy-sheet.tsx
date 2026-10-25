import {
  NO_NAPPY_SIZES,
  SIZE_LABELS,
  SIZES,
  WET_SIZE_LABELS,
  type ChairNappySizes,
  type NappyType,
  type Size,
} from '@babble/domain';
import { Check, Droplet, Droplets, Sun, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '#/lib/cn';
import { BigButton } from './big-button';
import { NAPPY_SAVED } from './chair-flow';
import { Sheet } from './sheet';
import { OUTLINED } from './styles';

const NAPPIES: { value: NappyType; label: string; icon: LucideIcon | null; poo: boolean }[] = [
  { value: 'wet', label: 'Wet', icon: Droplet, poo: false },
  { value: 'dirty', label: 'Dirty', icon: null, poo: true },
  { value: 'both', label: 'Both', icon: Droplet, poo: true },
  { value: 'dry', label: 'Dry', icon: Sun, poo: false },
];

const DOTS: Record<Size, string> = {
  tiny: 'size-[1.6cqmin]',
  little: 'size-[2.6cqmin]',
  medium: 'size-[3.6cqmin]',
  large: 'size-[4.6cqmin]',
  massive: 'size-[5.6cqmin]',
};

export function NappySheet({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (type: NappyType, sizes: ChairNappySizes) => void;
}) {
  const [type, setType] = useState<NappyType | null>(null);
  const [sizes, setSizes] = useState<ChairNappySizes>(NO_NAPPY_SIZES);

  if (type && type !== 'dry') {
    return (
      <Sheet title={`Nappy · ${NAPPY_SAVED[type]}`} icon={Droplets} tone="bg-nappy-soft text-nappy" onClose={onClose}>
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-[2cqmin]">
          {(type === 'wet' || type === 'both') && (
            <SizeRow
              label="Wetness"
              labels={WET_SIZE_LABELS}
              value={sizes.wetSize}
              onChange={(wetSize) => setSizes({ ...sizes, wetSize })}
            />
          )}
          {(type === 'dirty' || type === 'both') && (
            <SizeRow
              label="Poo size"
              labels={SIZE_LABELS}
              value={sizes.pooSize}
              onChange={(pooSize) => setSizes({ ...sizes, pooSize })}
            />
          )}
        </div>
        <div className="flex flex-none flex-wrap gap-[3cqmin] text-[length:6cqmin]">
          <BigButton
            onClick={() => onPick(type, NO_NAPPY_SIZES)}
            className={cn('h-[18.4cqmin] flex-[1_1_30cqmin] rounded-full', OUTLINED)}
          >
            Skip
          </BigButton>
          <BigButton
            onClick={() => onPick(type, sizes)}
            className="h-[18.4cqmin] flex-[2_1_50cqmin] rounded-full bg-primary text-on-primary"
          >
            <Check className="size-[6.4cqmin]" strokeWidth={2.75} />
            Save
          </BigButton>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="Nappy" icon={Droplets} tone="bg-nappy-soft text-nappy" onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-wrap content-stretch gap-[3cqmin]">
        {NAPPIES.map((option) => (
          <BigButton
            key={option.value}
            onClick={() => (option.value === 'dry' ? onPick('dry', NO_NAPPY_SIZES) : setType(option.value))}
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

function SizeRow({
  label,
  labels,
  value,
  onChange,
}: {
  label: string;
  labels: Record<Size, string>;
  value: Size | null;
  onChange: (value: Size | null) => void;
}) {
  return (
    <div className="flex max-h-[22cqmin] min-h-0 flex-1 flex-col gap-[1cqmin]">
      <span className="flex-none text-[length:4cqmin] font-bold text-ink-2">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex min-h-0 flex-1 gap-[2cqmin]">
        {SIZES.map((size) => {
          const selected = value === size;
          return (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(selected ? null : size)}
              className={cn(
                'box-border flex min-h-0 flex-1 flex-col items-center justify-center gap-[1cqmin] rounded-[3cqmin] border-[0.5cqmin] text-[length:4.2cqmin] leading-none font-bold',
                selected
                  ? 'border-primary bg-primary-soft text-on-primary-soft'
                  : 'border-line-strong bg-raised text-ink',
              )}
            >
              <span className="flex h-[5.6cqmin] flex-none items-center">
                <span className={cn('rounded-full', DOTS[size], selected ? 'bg-primary' : 'bg-ink-3')} />
              </span>
              {labels[size]}
            </button>
          );
        })}
      </div>
    </div>
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
