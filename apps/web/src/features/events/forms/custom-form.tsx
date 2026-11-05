import { canSaveCustomTitle, matchingCustomTitle, normaliseCustomTitle, type DraftOfType } from '@babble/domain';
import { Plus } from 'lucide-react';
import { SingleChips } from '#/components/ui/chips';
import { DateTimeField, TextAreaField, TextField } from '#/components/ui/field';
import { Stepper } from '#/components/ui/stepper';
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
  const details = draft.details;
  const set = (patch: Partial<typeof details>) => onChange({ ...draft, details: { ...details, ...patch } });
  const minutes = draft.endedAt ? Math.round((Date.parse(draft.endedAt) - Date.parse(draft.startedAt)) / 60_000) : 0;

  return (
    <FormSection>
      <TextField
        label="Title"
        value={details.title}
        error={errors.title}
        onChange={(event) => set({ title: event.target.value })}
      />
      <SingleChips
        label="Suggestions"
        options={suggestions.map((title) => ({ value: title, label: title }))}
        value={matchingCustomTitle(suggestions, details.title)}
        onChange={(title) => set({ title: title ?? '' })}
      >
        {onSaveTitle && canSaveCustomTitle(saved, details.title) && (
          <button
            type="button"
            onClick={() => onSaveTitle(details.title)}
            className="inline-flex h-11 items-center gap-1.5 rounded-chip border border-dashed border-line-strong px-4 text-label text-ink-2 transition-colors duration-base hover:text-ink"
          >
            <Plus className="size-4" strokeWidth={2.75} />
            Save “{normaliseCustomTitle(details.title)}”
          </button>
        )}
      </SingleChips>
      {saveError && <p className="-mt-3 text-meta text-danger">{saveError}</p>}
      <TextAreaField
        label="Description (optional)"
        value={details.description}
        onChange={(event) => set({ description: event.target.value })}
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
