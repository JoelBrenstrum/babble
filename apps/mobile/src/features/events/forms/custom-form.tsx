import {
  canSaveCustomTitle,
  CUSTOM_KIND_LABELS,
  CUSTOM_KINDS,
  customMinutes,
  matchingCustomTitle,
  MAX_CUSTOM_AMOUNT,
  MAX_CUSTOM_UNIT_LENGTH,
  normaliseCustomTitle,
  withCustomKind,
  withCustomMinutes,
  withCustomStart,
  withCustomTitle,
  type CustomTitle,
  type DraftOfType,
} from '@babble/domain';
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
  onSaveTitle,
  saveError,
}: FormProps<DraftOfType<'custom'>> & {
  saved: readonly CustomTitle[];
  onSaveTitle?: (entry: CustomTitle) => void;
  saveError?: string | null;
}) {
  const mutedColor = useTokenColor('--ink-2');
  const details = draft.details;
  const set = (patch: Partial<typeof details>) => onChange({ ...draft, details: { ...details, ...patch } });
  const entry: CustomTitle = { title: details.title, kind: details.kind, unit: details.unit };

  return (
    <FormSection>
      <TextField label="Title" value={details.title} error={errors.title} onChangeText={(title) => set({ title })} />
      <SingleChips
        label="Suggestions"
        options={saved.map(({ title }) => ({ value: title, label: title }))}
        value={matchingCustomTitle(saved, details.title)?.title ?? null}
        onChange={(title) => onChange(withCustomTitle(draft, saved.find((item) => item.title === title) ?? null))}
      >
        {onSaveTitle && canSaveCustomTitle(saved, entry) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Save “${normaliseCustomTitle(details.title)}”`}
            onPress={() => onSaveTitle(entry)}
            className="h-11 flex-row items-center gap-1.5 rounded-chip border border-dashed border-line-strong px-4"
          >
            <Plus size={16} color={mutedColor} strokeWidth={2.75} />
            <Text className="font-sans text-label text-ink-2">Save “{normaliseCustomTitle(details.title)}”</Text>
          </Pressable>
        )}
      </SingleChips>
      {saveError && <Text className="-mt-3 font-sans text-meta text-danger">{saveError}</Text>}
      <SingleChips
        label="Captures"
        options={CUSTOM_KINDS.map((kind) => ({ value: kind, label: CUSTOM_KIND_LABELS[kind] }))}
        value={details.kind}
        onChange={(kind) => kind && onChange(withCustomKind(draft, kind))}
      />
      {details.kind === 'amount' && (
        <>
          <Stepper
            label="Amount"
            unit={details.unit ?? ''}
            step={1}
            max={MAX_CUSTOM_AMOUNT}
            value={details.amount}
            onChange={(amount) => set({ amount })}
          />
          {errors.amount && <Text className="font-sans text-meta text-danger">{errors.amount}</Text>}
          <TextField
            label="Unit"
            placeholder="drops"
            maxLength={MAX_CUSTOM_UNIT_LENGTH}
            value={details.unit ?? ''}
            onChangeText={(unit) => set({ unit: unit || null })}
          />
        </>
      )}
      <TextField
        label="Description (optional)"
        value={details.description}
        multiline
        onChangeText={(description) => set({ description })}
      />
      <DateTimeField
        label={details.kind === 'duration' ? 'Start' : 'Time'}
        timeZone={timeZone}
        value={draft.startedAt}
        error={errors.startedAt}
        onChange={(startedAt) => onChange(withCustomStart(draft, startedAt))}
      />
      {details.kind === 'duration' && (
        <Stepper
          label="Length"
          unit="min"
          step={1}
          value={customMinutes(draft)}
          onChange={(value) => onChange(withCustomMinutes(draft, value ?? 0))}
        />
      )}
    </FormSection>
  );
}
