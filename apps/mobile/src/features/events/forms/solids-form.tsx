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
import { Check, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/button';
import { SingleChips } from '@/components/chips';
import { DateTimeField } from '@/components/datetime-field';
import { useTokenColor } from '@/lib/theme';
import { FormSection, instantDraft, type FormProps } from './shared';

const AMOUNTS = (Object.keys(SOLIDS_AMOUNT_LABELS) as SolidsAmount[]).map((value) => ({
  value,
  label: SOLIDS_AMOUNT_LABELS[value],
}));

const REACTIONS = (Object.keys(SOLIDS_REACTION_LABELS) as SolidsReaction[]).map((value) => ({
  value,
  label: SOLIDS_REACTION_LABELS[value],
}));

function FoodChip({ food, selected, onPress }: { food: string; selected: boolean; onPress: () => void }) {
  const checkColor = useTokenColor('--on-solids');
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={food}
      onPress={onPress}
      className={`h-11 flex-row items-center gap-1.5 rounded-chip border px-4 ${selected ? 'border-solids bg-solids-soft' : 'border-line bg-raised'}`}
    >
      {selected && <Check size={16} color={checkColor} strokeWidth={3} />}
      <Text className={`text-label ${selected ? 'font-semibold text-on-solids' : 'font-sans text-ink'}`}>{food}</Text>
    </Pressable>
  );
}

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
  const placeholderColor = useTokenColor('--ink-3');
  const inkColor = useTokenColor('--ink');
  const suggestions = foodSuggestions(recentFoods(history), details.foods);
  const firstTries = newFoods({ id: eventId, startedAt: draft.startedAt, foods: details.foods }, history);

  function addTyped() {
    if (!typed.trim()) return;
    set({ foods: addFood(details.foods, typed) });
    setTyped('');
  }

  return (
    <FormSection>
      <View className="gap-2">
        <Text className="font-semibold text-label text-ink">Foods</Text>
        <View className="flex-row flex-wrap gap-2">
          {suggestions.map((food) => (
            <FoodChip
              key={food}
              food={food}
              selected={hasFood(details.foods, food)}
              onPress={() => set({ foods: toggleFood(details.foods, food) })}
            />
          ))}
        </View>
        <View className="mt-1 flex-row gap-2">
          <TextInput
            accessibilityLabel="Add a food"
            placeholder="Add a food"
            placeholderTextColor={placeholderColor}
            value={typed}
            maxLength={MAX_FOOD_LENGTH}
            returnKeyType="done"
            submitBehavior="submit"
            onChangeText={setTyped}
            onSubmitEditing={addTyped}
            className={`min-h-tap flex-1 rounded-button border bg-raised px-4 font-sans text-body text-ink ${errors.foods ? 'border-danger' : 'border-line-strong'}`}
          />
          <Button
            variant="secondary"
            disabled={!typed.trim()}
            onPress={addTyped}
            icon={<Plus size={20} color={inkColor} strokeWidth={2.75} />}
          >
            Add
          </Button>
        </View>
        {errors.foods && <Text className="font-sans text-meta text-danger">{errors.foods}</Text>}
        {firstTries.length > 0 && history.length > 0 && (
          <Text className="font-sans text-meta text-on-solids">{`First try: ${firstTries.join(', ')}`}</Text>
        )}
      </View>
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
