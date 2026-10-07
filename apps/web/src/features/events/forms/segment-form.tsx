import { segmentTotals, type DraftOfType, type Side, type TimedSegment } from '@babble/domain';
import { DateTimeField } from '#/components/ui/field';
import { SegmentEditor } from '../segment-editor';
import { Stepper } from '#/components/ui/stepper';
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
  const minutes = minutesBySide(draft.segments);

  function setMinutes(side: Side, value: number | null) {
    const segments = buildSegments(draft.startedAt, { ...minutes, [side]: value });
    const endedAt = segments.at(-1)?.endedAt ?? draft.startedAt;
    onChange({ ...draft, segments, endedAt });
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
      {isNew ? (
        <div className="grid gap-5 sm:grid-cols-2">
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
        </div>
      ) : (
        <SegmentEditor
          key={draft.startedAt}
          startedAt={draft.startedAt}
          segments={draft.segments}
          onChange={({ segments, endedAt }) => onChange({ ...draft, segments, endedAt })}
        />
      )}
      {errors.segments && <p className="text-meta text-danger">{errors.segments}</p>}
    </FormSection>
  );
}

export function BreastFeedForm(props: FormProps<DraftOfType<'breast_feed'>>) {
  return <SegmentTimesFields {...props} />;
}
