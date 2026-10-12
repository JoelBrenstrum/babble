import type { BabyChoice } from '@babble/api';
import { babyAgeLabel, todayInTimeZone } from '@babble/domain';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Card } from '#/components/ui/card';
import { AddBabyRow, BabyAvatar, babyTone } from '#/components/shell/baby-switcher';
import { PlusDialog } from '#/features/plus-dialog';
import { cn } from '#/lib/cn';

export function SettingsBabyPicker({
  choices,
  activeId,
  onSelect,
  addBabyLocked,
}: {
  choices: readonly BabyChoice[];
  activeId: string;
  onSelect: (choice: BabyChoice) => void;
  addBabyLocked: boolean;
}) {
  const [pitching, setPitching] = useState(false);
  const multipleFamilies = new Set(choices.map((choice) => choice.familyId)).size > 1;

  return (
    <Card className="flex flex-col gap-1 p-2">
      <div role="radiogroup" aria-label="Baby" className="flex flex-col gap-1">
        {choices.map((choice, index) => {
          const selected = choice.baby.id === activeId;
          const showFamily = multipleFamilies && choice.familyId !== choices[index - 1]?.familyId;
          return (
            <div key={choice.baby.id} className="flex flex-col">
              {showFamily && (
                <div className="px-3 pb-1 pt-2 text-section font-semibold uppercase text-ink-3">
                  {choice.familyName}
                </div>
              )}
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => !selected && onSelect(choice)}
                className={cn(
                  'flex min-h-tap w-full items-center gap-3 rounded-button px-3 py-2 text-left',
                  selected ? 'bg-primary-soft' : 'hover:bg-surface',
                )}
              >
                <BabyAvatar name={choice.baby.name} tone={babyTone(choices, choice.baby.id)} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold">{choice.baby.name}</span>
                  <span className="block text-meta text-ink-2">
                    {babyAgeLabel(choice.baby.birth_date, todayInTimeZone(choice.baby.timezone))}
                  </span>
                </span>
                {selected && <Check className="size-5 text-primary" strokeWidth={3} />}
              </button>
            </div>
          );
        })}
      </div>
      <div className="border-t border-line pt-1">
        <AddBabyRow locked={addBabyLocked} onPitch={() => setPitching(true)} />
      </div>
      {pitching && <PlusDialog feature="multiple_babies" onClose={() => setPitching(false)} />}
    </Card>
  );
}
