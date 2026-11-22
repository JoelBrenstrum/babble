import {
  ALERT_ACTIVITIES,
  ALERT_ACTIVITY_LABELS,
  ALERT_END_LABELS,
  ALERT_ENDS,
  formatDuration,
  type AlertDetails,
  type DraftOfType,
} from '@babble/domain';
import { Text, View } from 'react-native';
import { MultiChips, SingleChips } from '@/components/chips';
import { DateTimeField } from '@/components/datetime-field';
import { FormSection, type FormProps } from './shared';

const ACTIVITY_OPTIONS = ALERT_ACTIVITIES.map((value) => ({ value, label: ALERT_ACTIVITY_LABELS[value] }));
const END_OPTIONS = ALERT_ENDS.map((value) => ({ value, label: ALERT_END_LABELS[value] }));

export function AlertActivityChips({
  value,
  onChange,
}: {
  value: AlertDetails['activities'];
  onChange: (activities: AlertDetails['activities']) => void;
}) {
  return <MultiChips label="Activities" options={ACTIVITY_OPTIONS} value={value} onChange={onChange} />;
}

export function AlertForm({ draft, onChange, errors, timeZone }: FormProps<DraftOfType<'alert'>>) {
  const details = draft.details;
  const endedAt = draft.endedAt ?? draft.startedAt;
  const set = (patch: Partial<AlertDetails>) => onChange({ ...draft, details: { ...details, ...patch } });
  const spanMs = Date.parse(endedAt) - Date.parse(draft.startedAt);

  return (
    <FormSection>
      <DateTimeField
        label="Became alert"
        timeZone={timeZone}
        value={draft.startedAt}
        error={errors.startedAt}
        onChange={(startedAt) => onChange({ ...draft, startedAt })}
      />
      <DateTimeField
        label="Ended"
        timeZone={timeZone}
        value={endedAt}
        error={errors.endedAt}
        onChange={(value) => onChange({ ...draft, endedAt: value })}
      />
      {spanMs > 0 && (
        <View className="flex-row items-center justify-between rounded-tile bg-alert-soft px-4 py-3">
          <Text className="font-semibold text-body text-on-alert">Alert for</Text>
          <Text className="font-bold text-row-title text-on-alert">{formatDuration(spanMs, { seconds: false })}</Text>
        </View>
      )}
      <AlertActivityChips value={details.activities} onChange={(activities) => set({ activities })} />
      <SingleChips
        label="What ended it?"
        options={END_OPTIONS}
        value={details.endedBy}
        onChange={(endedBy) => set({ endedBy })}
      />
    </FormSection>
  );
}
