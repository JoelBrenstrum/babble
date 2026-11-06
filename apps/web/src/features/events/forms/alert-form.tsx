import {
  ALERT_ACTIVITIES,
  ALERT_ACTIVITY_LABELS,
  ALERT_END_LABELS,
  ALERT_ENDS,
  formatDuration,
  type AlertDetails,
  type DraftOfType,
} from '@babble/domain';
import { MultiChips, SingleChips } from '#/components/ui/chips';
import { DateTimeField } from '#/components/ui/field';
import { FormSection, type FormProps } from './shared';

const ACTIVITY_OPTIONS = ALERT_ACTIVITIES.map((value) => ({ value, label: ALERT_ACTIVITY_LABELS[value] }));
const END_OPTIONS = ALERT_ENDS.map((value) => ({ value, label: ALERT_END_LABELS[value] }));

export function AlertActivityChips({
  details,
  onChange,
}: {
  details: AlertDetails;
  onChange: (patch: Partial<AlertDetails>) => void;
}) {
  return (
    <MultiChips
      label="Activities (optional)"
      options={ACTIVITY_OPTIONS}
      value={details.activities}
      onChange={(activities) => onChange({ activities })}
    />
  );
}

export function AlertForm({ draft, onChange, errors, timeZone }: FormProps<DraftOfType<'alert'>>) {
  const details = draft.details;
  const set = (patch: Partial<AlertDetails>) => onChange({ ...draft, details: { ...details, ...patch } });
  const endedAt = draft.endedAt ?? draft.startedAt;
  const lengthMs = Date.parse(endedAt) - Date.parse(draft.startedAt);

  return (
    <FormSection>
      <div className="grid gap-5 sm:grid-cols-2">
        <DateTimeField
          label="Alert from"
          timeZone={timeZone}
          value={draft.startedAt}
          error={errors.startedAt}
          onChange={(startedAt) => onChange({ ...draft, startedAt })}
        />
        <DateTimeField
          label="Until"
          timeZone={timeZone}
          value={endedAt}
          error={errors.endedAt}
          onChange={(value) => onChange({ ...draft, endedAt: value })}
        />
      </div>
      {lengthMs > 0 && (
        <p className="tabular text-meta text-ink-2">Alert for {formatDuration(lengthMs, { seconds: false })}</p>
      )}
      <AlertActivityChips details={details} onChange={set} />
      <SingleChips
        label="What ended it? (optional)"
        options={END_OPTIONS}
        value={details.endedBy}
        onChange={(endedBy) => set({ endedBy })}
      />
    </FormSection>
  );
}
