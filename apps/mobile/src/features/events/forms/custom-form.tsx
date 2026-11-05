import { canSaveCustomTitle, matchingCustomTitle, normaliseCustomTitle, type DraftOfType } from '@babble/domain';
import { Plus } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';
import { SingleChips } from '@/components/chips';
import { DateTimeField } from '@/components/datetime-field';
import { Stepper } from '@/components/stepper';
import { TextField } from '@/components/text-field';
import { useTokenColor } from '@/lib/theme';
import { FormSection, type FormProps } from './shared';

export function CustomForm({
  draft,
  onChange,
  errors,
  timeZone,
  saved,
  suggestions,
  onSaveTitle,
  saveError,
}: FormProps<DraftOfType<'custom'>> & {
  saved: readonly string[];
  suggestions: readonly string[];
  onSaveTitle?: (title: string) => void;
  saveError?: string | null;
}) {
  const mutedColor = useTokenColor('--ink-2');
  const details = draft.details;
  const set = (patch: Partial<typeof details>) => onChange({ ...draft, details: { ...details, ...patch } });
  const minutes = draft.endedAt ? Math.round((Date.parse(draft.endedAt) - Date.parse(draft.startedAt)) / 60_000) : 0;

  return (
    <FormSection>
      <TextField label="Title" value={details.title} error={errors.title} onChangeText={(title) => set({ title })} />
      <SingleChips
        label="Suggestions"
        options={suggestions.map((title) => ({ value: title, label: title }))}
        value={matchingCustomTitle(suggestions, details.title)}
        onChange={(title) => set({ title: title ?? '' })}
      >
        {onSaveTitle && canSaveCustomTitle(saved, details.title) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Save “${normaliseCustomTitle(details.title)}”`}
            onPress={() => onSaveTitle(details.title)}
            className="h-11 flex-row items-center gap-1.5 rounded-chip border border-dashed border-line-strong px-4"
          >
            <Plus size={16} color={mutedColor} strokeWidth={2.75} />
            <Text className="font-sans text-label text-ink-2">Save “{normaliseCustomTitle(details.title)}”</Text>
          </Pressable>
        )}
      </SingleChips>
      {saveError && <Text className="-mt-3 font-sans text-meta text-danger">{saveError}</Text>}
      <TextField
        label="Description (optional)"
        value={details.description}
        multiline
        onChangeText={(description) => set({ description })}
      />
      <DateTimeField
        label="Start"
        timeZone={timeZone}
        value={draft.startedAt}
        error={errors.startedAt}
        onChange={(startedAt) =>
          onChange({ ...draft, startedAt, endedAt: new Date(Date.parse(startedAt) + minutes * 60_000).toISOString() })
        }
      />
      <Stepper
        label="Length"
        unit="min"
        step={5}
        value={minutes}
        onChange={(value) =>
          onChange({ ...draft, endedAt: new Date(Date.parse(draft.startedAt) + (value ?? 0) * 60_000).toISOString() })
        }
      />
    </FormSection>
  );
}
