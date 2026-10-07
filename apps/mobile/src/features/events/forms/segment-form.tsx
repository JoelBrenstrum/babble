import { formatDuration, segmentTotals, type DraftOfType, type Side, type TimedSegment } from '@babble/domain';
import { Text } from 'react-native';
import { DateTimeField } from '@/components/datetime-field';
import { Stepper } from '@/components/stepper';
import { FormSection, shiftDraftStart, type FormProps } from './shared';

export function buildSegments(startedAt: string, minutes: Record<Side, number | null>): TimedSegment[] {
  const segments: TimedSegment[] = [];
  let cursor = Date.parse(startedAt);
  for (const side of ['left', 'right'] as const) {
    const value = minutes[side];
    if (!value || value <= 0) continue;
    const end = cursor + value * 60_000;
    segments.push({ side, startedAt: new Date(cursor).toISOString(), endedAt: new Date(end).toISOString() });
    cursor = end;
  }
  return segments;
}

function minutesBySide(segments: TimedSegment[]): Record<Side, number | null> {
  const totals = segmentTotals(segments, new Date());
  return {
    left: totals.leftMs ? Math.round(totals.leftMs / 60_000) : null,
    right: totals.rightMs ? Math.round(totals.rightMs / 60_000) : null,
  };
}

export function SegmentTimesFields<D extends DraftOfType<'breast_feed'> | DraftOfType<'pump'>>({
  draft,
  onChange,
  errors,
  timeZone,
  isNew,
}: FormProps<D>) {
  const editableDurations = isNew || draft.segments.length <= 2;
  const minutes = minutesBySide(draft.segments);

  function setMinutes(side: Side, value: number | null) {
    const segments = buildSegments(draft.startedAt, { ...minutes, [side]: value });
    onChange({ ...draft, segments, endedAt: segments.at(-1)?.endedAt ?? draft.startedAt });
  }

  return (
    <FormSection>
      <DateTimeField
        label="Started"
        timeZone={timeZone}
        value={draft.startedAt}
        error={errors.startedAt}
        onChange={(startedAt) => onChange(shiftDraftStart(draft, startedAt))}
      />
      {editableDurations ? (
        <>
          <Stepper
            label="Left"
            unit="min"
            step={1}
            value={minutes.left}
            onChange={(value) => setMinutes('left', value)}
          />
          <Stepper
            label="Right"
            unit="min"
            step={1}
            value={minutes.right}
            onChange={(value) => setMinutes('right', value)}
          />
        </>
      ) : (
        <Text className="rounded-tile bg-surface px-4 py-3 font-sans text-meta text-ink-2">
          {`${draft.segments.length} timed segments · ${formatDuration(segmentTotals(draft.segments, new Date()).activeMs, { seconds: false })} in total. Editing individual segments arrives in the next update.`}
        </Text>
      )}
      {errors.segments && <Text className="font-sans text-meta text-danger">{errors.segments}</Text>}
    </FormSection>
  );
}

export function BreastFeedForm(props: FormProps<DraftOfType<'breast_feed'>>) {
  return <SegmentTimesFields {...props} />;
}
