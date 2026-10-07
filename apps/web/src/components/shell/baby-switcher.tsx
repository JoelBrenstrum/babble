import type { BabyChoice } from '@babble/api';
import { babyAgeLabel, todayInTimeZone } from '@babble/domain';
import { Link } from '@tanstack/react-router';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '#/lib/cn';

const AVATAR_TONES = [
  'bg-primary text-on-primary',
  'bg-secondary text-on-secondary',
  'bg-sleep text-ink-on-solid',
  'bg-nappy text-ink-on-solid',
  'bg-growth text-ink-on-solid',
];

export function babyTone(choices: readonly BabyChoice[], babyId: string): string {
  const index = Math.max(
    0,
    choices.findIndex((choice) => choice.baby.id === babyId),
  );
  return AVATAR_TONES[index % AVATAR_TONES.length]!;
}

export function BabyAvatar({ name, tone, size = 'md' }: { name: string; tone: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-bold',
        size === 'sm' ? 'size-8 text-label' : 'size-10 text-heading',
        tone,
      )}
    >
      {name[0]}
    </span>
  );
}

export function BabySwitcher({
  choices,
  activeId,
  onSelect,
  layout,
}: {
  choices: readonly BabyChoice[];
  activeId: string;
  onSelect: (choice: BabyChoice) => void;
  layout: 'sidebar' | 'rail' | 'header';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const active = choices.find((choice) => choice.baby.id === activeId) ?? choices[0];
  const multipleFamilies = new Set(choices.map((choice) => choice.familyId)).size > 1;

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (!active) return null;
  const age = babyAgeLabel(active.baby.birth_date, todayInTimeZone(active.baby.timezone));

  return (
    <div ref={ref} className={cn('relative', layout === 'header' && 'min-w-0 flex-1')}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${active.baby.name}, ${age}. Switch baby`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center gap-3 rounded-card text-left transition-colors duration-fast',
          layout === 'sidebar' && 'bg-surface p-3 hover:bg-line',
          layout === 'rail' && 'justify-center p-3 hover:bg-surface',
          layout === 'header' && 'min-w-0 -ml-2 p-2 hover:bg-surface',
        )}
      >
        <BabyAvatar name={active.baby.name} tone={babyTone(choices, active.baby.id)} />
        {layout !== 'rail' && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-row-title font-bold">{active.baby.name}</span>
            <span className="block text-meta text-ink-2">{age}</span>
          </span>
        )}
        {layout !== 'rail' && <ChevronsUpDown className="size-4 shrink-0 text-ink-2" strokeWidth={2.75} />}
      </button>

      {open && (
        <div
          className={cn(
            'absolute z-30 mt-2 w-72 rounded-card border border-line bg-raised p-2 shadow-sheet',
            layout === 'rail' ? 'left-full top-0 ml-2 mt-0' : 'left-0',
          )}
        >
          <ul id={listId} role="listbox" aria-label="Babies" className="flex flex-col gap-1">
            {choices.map((choice, index) => {
              const selected = choice.baby.id === active.baby.id;
              const showFamily = multipleFamilies && choice.familyId !== choices[index - 1]?.familyId;
              return (
                <li key={choice.baby.id} role="presentation">
                  {showFamily && (
                    <div className="px-3 pb-1 pt-2 text-section font-semibold uppercase text-ink-3">
                      {choice.familyName}
                    </div>
                  )}
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setOpen(false);
                      if (!selected) onSelect(choice);
                    }}
                    className="flex min-h-tap w-full items-center gap-3 rounded-button px-3 py-2 text-left hover:bg-surface"
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
                </li>
              );
            })}
          </ul>
          <div className="mt-1 border-t border-line pt-1">
            <Link
              to="/onboarding/baby"
              search={{ mode: 'add' }}
              onClick={() => setOpen(false)}
              className="flex min-h-tap items-center gap-3 rounded-button px-3 py-2 text-body font-semibold text-primary hover:bg-surface"
            >
              <span className="grid size-8 place-items-center rounded-full border-2 border-dashed border-primary/60">
                <Plus className="size-4" strokeWidth={3} />
              </span>
              Add a baby
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
