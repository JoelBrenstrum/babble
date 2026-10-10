import {
  addFood,
  foodSuggestions,
  hasFood,
  MAX_FOOD_LENGTH,
  newFoods,
  recentFoods,
  SOLIDS_AMOUNT_LABELS,
  SOLIDS_REACTION_LABELS,
  toggleFood,
  type BabyEvent,
  type DraftOfType,
  type SolidsAmount,
  type SolidsReaction,
} from '@babble/domain';
import { Check, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '#/components/ui/button';
import { SingleChips } from '#/components/ui/chips';
import { DateTimeField } from '#/components/ui/field';
import { cn } from '#/lib/cn';
import { FormSection, instantDraft, type FormProps } from './shared';

const AMOUNTS = (Object.keys(SOLIDS_AMOUNT_LABELS) as SolidsAmount[]).map((value) => ({
  value,
  label: SOLIDS_AMOUNT_LABELS[value],
}));

const REACTIONS = (Object.keys(SOLIDS_REACTION_LABELS) as SolidsReaction[]).map((value) => ({
  value,
  label: SOLIDS_REACTION_LABELS[value],
}));

export function SolidsForm({
  draft,
  onChange,
  errors,
  timeZone,
  history,
  eventId,
}: FormProps<DraftOfType<'solids'>> & { history: readonly BabyEvent[]; eventId?: string }) {
  const details = draft.details;
  const set = (patch: Partial<typeof details>) => onChange({ ...draft, details: { ...details, ...patch } });
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const suggestions = foodSuggestions(recentFoods(history), details.foods);
  const firstTries = newFoods({ id: eventId, startedAt: draft.startedAt, foods: details.foods }, history);

  function addTyped() {
    if (!typed.trim()) return;
    set({ foods: addFood(details.foods, typed) });
    setTyped('');
  }

  return (
    <FormSection>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label font-semibold">Foods</legend>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((food) => {
            const selected = hasFood(details.foods, food);
            return (
              <button
                key={food}
                type="button"
                role="checkbox"
                aria-checked={selected}
                onClick={() => set({ foods: toggleFood(details.foods, food) })}
                className={cn(
                  'inline-flex h-11 items-center gap-1.5 rounded-chip border px-4 text-label transition-colors duration-base',
                  selected
                    ? 'border-solids bg-solids-soft font-semibold text-on-solids'
                    : 'border-line bg-raised text-ink',
                )}
              >
                {selected && <Check className="size-4" strokeWidth={3} />}
                {food}
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            Add a food
          </label>
          <input
            id={inputId}
            value={typed}
            maxLength={MAX_FOOD_LENGTH}
            placeholder="Add a food"
            aria-invalid={errors.foods ? true : undefined}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              addTyped();
            }}
            className="h-tap min-w-0 flex-1 rounded-button border border-line-strong bg-raised px-4 text-body text-ink placeholder:text-ink-3 aria-[invalid=true]:border-danger"
          />
          <Button variant="secondary" onClick={addTyped} disabled={!typed.trim()}>
            <Plus className="size-5" strokeWidth={2.75} />
            Add
          </Button>
        </div>
        {errors.foods && <p className="text-meta text-danger">{errors.foods}</p>}
        {firstTries.length > 0 && history.length > 0 && (
          <p className="text-meta text-on-solids">First try: {firstTries.join(', ')}</p>
        )}
      </fieldset>
      <SingleChips label="How much" options={AMOUNTS} value={details.amount} onChange={(amount) => set({ amount })} />
      <SingleChips
        label="Reaction"
        options={REACTIONS}
        value={details.reaction}
        onChange={(reaction) => set({ reaction })}
      />
      <DateTimeField
        label="Time"
        timeZone={timeZone}
        value={draft.startedAt}
        error={errors.startedAt}
        onChange={(at) => onChange(instantDraft(draft, at))}
      />
    </FormSection>
  );
}
