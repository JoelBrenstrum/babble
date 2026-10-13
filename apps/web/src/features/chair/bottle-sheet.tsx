import { bottleStep, formatBottleAmount, stepBottleAmount, type BottleContent, type Units } from '@babble/domain';
import { Check, Milk, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '#/lib/cn';
import { BigButton } from './big-button';
import { Sheet } from './sheet';
import type { ChairData } from './types';

const CONTENTS: { value: BottleContent; label: string }[] = [
  { value: 'breast_milk', label: 'Breast milk' },
  { value: 'formula', label: 'Formula' },
  { value: 'mixed', label: 'Mixed' },
];

export function BottleSheet({
  units,
  initial,
  onClose,
  onSave,
}: {
  units: Units;
  initial: ChairData['bottle'];
  onClose: () => void;
  onSave: (amount: number, content: BottleContent) => void;
}) {
  const [amount, setAmount] = useState(initial.amount);
  const [content, setContent] = useState(initial.content);
  const unit = units === 'metric' ? 'ml' : 'oz';
  const step = formatBottleAmount(bottleStep(units));
  const stepper = (direction: 1 | -1) => (
    <BigButton
      label={`${direction === 1 ? 'More' : 'Less'}, ${step} ${unit}`}
      onClick={() => setAmount(stepBottleAmount(amount, direction, units))}
      className="size-[22cqmin] flex-none flex-col gap-0 rounded-full border-[0.5cqmin] border-line-strong bg-surface"
    >
      {direction === 1 ? (
        <Plus className="size-[8cqmin]" strokeWidth={2.75} />
      ) : (
        <Minus className="size-[8cqmin]" strokeWidth={2.75} />
      )}
      <span className="text-[length:3.6cqmin] text-ink-2">{step}</span>
    </BigButton>
  );
  return (
    <Sheet title="Bottle" icon={Milk} tone="bg-bottle-soft text-bottle" onClose={onClose}>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-[5cqmin]">
        {stepper(-1)}
        <span
          aria-live="polite"
          className="tabular min-w-[44cqmin] text-center text-[length:18cqmin] leading-none font-bold"
        >
          {formatBottleAmount(amount)}
          <span className="ml-[1.4cqmin] text-[length:7cqmin] font-semibold text-ink-2">{unit}</span>
        </span>
        {stepper(1)}
      </div>
      <div className="flex flex-none flex-wrap gap-[3cqmin]">
        <div role="radiogroup" aria-label="Contents" className="flex flex-[3_1_90cqmin] gap-[2cqmin]">
          {CONTENTS.map((option) => {
            const selected = option.value === content;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setContent(option.value)}
                className={cn(
                  'box-border flex h-[18.4cqmin] flex-1 items-center justify-center gap-[1.2cqmin] rounded-full border-[0.5cqmin] text-[length:4.8cqmin] font-bold whitespace-nowrap',
                  selected
                    ? 'border-primary bg-primary-soft text-on-primary-soft'
                    : 'border-line-strong bg-raised text-ink',
                )}
              >
                {selected && <Check className="size-[4.6cqmin]" strokeWidth={3} />}
                {option.label}
              </button>
            );
          })}
        </div>
        <BigButton
          onClick={() => onSave(amount, content)}
          className="h-[18.4cqmin] flex-[1_1_40cqmin] rounded-full bg-primary text-[length:6cqmin] text-on-primary"
        >
          <Check className="size-[6.4cqmin]" strokeWidth={2.75} />
          Save
        </BigButton>
      </div>
    </Sheet>
  );
}
