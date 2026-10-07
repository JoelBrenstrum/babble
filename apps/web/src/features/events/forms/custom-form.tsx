import type { DraftOfType } from '@babble/domain';
import { SingleChips } from '#/components/ui/chips';
import { DateTimeField, TextAreaField, TextField } from '#/components/ui/field';
import { Stepper } from '#/components/ui/stepper';
import { FormSection, type FormProps } from './shared';

const SUGGESTIONS = ['Bath', 'Tummy time', 'Vitamin drops', 'Skin to skin', 'Walk'];

export function CustomForm({ draft, onChange, errors, timeZone }: FormProps<DraftOfType<'custom'>>) {
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
        options={SUGGESTIONS.map((title) => ({ value: title, label: title }))}
        value={SUGGESTIONS.includes(details.title) ? details.title : null}
        onChange={(title) => set({ title: title ?? '' })}
      />
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
