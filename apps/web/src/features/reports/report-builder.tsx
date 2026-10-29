import {
  allowedSplits,
  canAddMeasure,
  CHART_TYPE_LABELS,
  CHART_TYPES,
  chartProblem,
  MEASURE_GROUP_LABELS,
  MEASURE_GROUPS,
  measuresInGroup,
  rangeNeedsPlus,
  REPORT_BUCKET_LABELS,
  REPORT_BUCKETS,
  REPORT_RANGE_LABELS,
  REPORT_RANGE_PRESETS,
  specMeasures,
  splitChoices,
  splitLabel,
  SPLIT_LABELS,
  suggestChart,
  toggleMeasure,
  withBucket,
  withChart,
  withSplit,
  type ReportFilter,
  type ReportSettings,
  type ReportSpec,
  type SplitKey,
} from '@babble/domain';
import { Plus, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from '#/components/ui/button';
import { MultiChips } from '#/components/ui/chips';
import { TextField } from '#/components/ui/field';
import { Segmented } from '#/components/ui/segmented';
import { PlusBadge } from '#/features/plus-dialog';
import { cn } from '#/lib/cn';
import { BuilderChip } from './builder-chip';
import { CHART_ICONS } from './report-icons';

type SectionKey = 'measure' | 'range' | 'split' | 'chart' | 'more';

const SECTIONS: { value: SectionKey; label: string }[] = [
  { value: 'measure', label: 'Measure' },
  { value: 'range', label: 'Range' },
  { value: 'split', label: 'Split' },
  { value: 'chart', label: 'Chart' },
  { value: 'more', label: 'More' },
];

const SELECTED_CHIP: Record<string, string> = {
  sleep: 'border-sleep bg-sleep-soft font-semibold text-on-sleep',
  feeds: 'border-feed-right bg-feed-right-soft font-semibold text-on-feed-right',
  nappies: 'border-nappy bg-nappy-soft font-semibold text-on-nappy',
  pump: 'border-pump bg-pump-soft font-semibold text-on-pump',
  solids: 'border-solids bg-solids-soft font-semibold text-on-solids',
  growth: 'border-growth bg-growth-soft font-semibold text-on-growth',
  custom: 'border-custom bg-custom-soft font-semibold text-on-custom',
  logging: 'border-primary bg-primary-soft font-semibold text-on-primary-soft',
};

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-label font-semibold">{title}</h3>
        {hint && <p className="text-caption text-ink-3">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Switch({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={cn('flex h-10 items-center justify-between gap-3 text-body', disabled && 'opacity-45')}>
      {label}
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        className="size-5 accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export interface ReportBuilderProps {
  spec: ReportSpec;
  onChange: (spec: ReportSpec) => void;
  settings: ReportSettings;
  preview: ReactNode;
  longRangesLocked: boolean;
  onLockedRange: () => void;
  footer: ReactNode;
}

export function ReportBuilder({
  spec,
  onChange,
  settings,
  preview,
  longRangesLocked,
  onLockedRange,
  footer,
}: ReportBuilderProps) {
  const [section, setSection] = useState<SectionKey>('measure');
  const [search, setSearch] = useState('');
  const [customRange, setCustomRange] = useState('from' in spec.range);
  const [addingFilter, setAddingFilter] = useState<{ key: SplitKey | 'text'; values: string[]; text: string } | null>(
    null,
  );
  const measures = specMeasures(spec);
  const splits = allowedSplits(spec);
  const suggested = measures.length ? suggestChart(spec) : null;
  const query = search.trim().toLowerCase();

  const measureSection = (
    <Section title="Measure" hint="Up to four with the same unit, or one to split.">
      <TextField
        label="Find a measure"
        placeholder="Search measures"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {MEASURE_GROUPS.map((group) => {
        const options = measuresInGroup(group).filter(
          (measure) => !query || measure.label.toLowerCase().includes(query),
        );
        if (options.length === 0) return null;
        return (
          <div key={group} className="flex flex-col gap-1.5">
            <span className="text-caption font-semibold uppercase text-ink-3">{MEASURE_GROUP_LABELS[group]}</span>
            <div className="flex flex-wrap gap-2">
              {options.map((measure) => {
                const selected = spec.series.some((series) => series.measure === measure.id);
                const reason = selected ? null : canAddMeasure(spec, measure);
                return (
                  <BuilderChip
                    key={measure.id}
                    label={measure.label}
                    selected={selected}
                    disabled={Boolean(reason)}
                    reason={reason}
                    selectedClass={SELECTED_CHIP[group]}
                    onClick={() => onChange(toggleMeasure(spec, measure))}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </Section>
  );

  const rangeSection = (
    <>
      <Section title="Range">
        <div className="flex flex-wrap gap-2">
          {REPORT_RANGE_PRESETS.map((preset) => {
            const locked = longRangesLocked && rangeNeedsPlus({ preset });
            return (
              <BuilderChip
                key={preset}
                label={REPORT_RANGE_LABELS[preset]}
                selected={!customRange && 'preset' in spec.range && spec.range.preset === preset}
                trailing={locked ? <PlusBadge /> : undefined}
                onClick={() => {
                  if (locked) return onLockedRange();
                  setCustomRange(false);
                  onChange({ ...spec, range: { preset } });
                }}
              />
            );
          })}
          <BuilderChip label="Custom…" selected={customRange} onClick={() => setCustomRange(true)} />
        </div>
        {customRange && (
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label="From"
              type="date"
              value={'from' in spec.range ? spec.range.from : ''}
              onChange={(event) => {
                const from = event.target.value;
                const to = 'from' in spec.range ? spec.range.to : from;
                if (from && to && from <= to) {
                  if (longRangesLocked && rangeNeedsPlus({ from, to })) return onLockedRange();
                  onChange({ ...spec, range: { from, to } });
                }
              }}
            />
            <TextField
              label="To"
              type="date"
              value={'from' in spec.range ? spec.range.to : ''}
              onChange={(event) => {
                const to = event.target.value;
                const from = 'from' in spec.range ? spec.range.from : to;
                if (from && to && from <= to) {
                  if (longRangesLocked && rangeNeedsPlus({ from, to })) return onLockedRange();
                  onChange({ ...spec, range: { from, to } });
                }
              }}
            />
          </div>
        )}
      </Section>
      <Section title="Group by">
        <div className="flex flex-wrap gap-2">
          {REPORT_BUCKETS.map((bucket) => (
            <BuilderChip
              key={bucket}
              label={REPORT_BUCKET_LABELS[bucket]}
              selected={spec.bucket === bucket}
              onClick={() => onChange(withBucket(spec, bucket))}
            />
          ))}
        </div>
      </Section>
    </>
  );

  const filterLabel = (filter: ReportFilter) =>
    filter.key === 'text'
      ? `Text contains "${filter.text}"`
      : `${SPLIT_LABELS[filter.key]} is ${filter.values.map((value) => splitLabel(filter.key, value, settings)).join(' or ')}`;

  const splitSection = (
    <>
      <Section title="Split by" hint={measures.length === 1 ? undefined : 'Pick one measure to split it.'}>
        <div className="flex flex-wrap gap-2">
          <BuilderChip
            label="None"
            selected={!spec.splitBy}
            disabled={measures.length !== 1}
            onClick={() => onChange(withSplit(spec, undefined))}
          />
          {splits.map((key) => (
            <BuilderChip
              key={key}
              label={SPLIT_LABELS[key]}
              selected={spec.splitBy === key}
              onClick={() => onChange(withSplit(spec, key))}
            />
          ))}
        </div>
      </Section>
      <Section title="Filters">
        {spec.filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {spec.filters.map((filter, index) => (
              <span
                key={index}
                className="inline-flex h-10 items-center gap-1 rounded-chip border border-line bg-surface pl-3 pr-1 text-label"
              >
                {filterLabel(filter)}
                <button
                  type="button"
                  aria-label={`Remove filter ${filterLabel(filter)}`}
                  className="grid size-8 place-items-center rounded-full hover:bg-line"
                  onClick={() => onChange({ ...spec, filters: spec.filters.filter((_, order) => order !== index) })}
                >
                  <X className="size-4" strokeWidth={2.75} />
                </button>
              </span>
            ))}
          </div>
        )}
        {addingFilter ? (
          <div className="flex flex-col gap-3 rounded-tile bg-surface p-3">
            <div className="flex flex-wrap gap-2">
              {[...splits, 'text' as const].map((key) => (
                <BuilderChip
                  key={key}
                  label={key === 'text' ? 'Text' : SPLIT_LABELS[key]}
                  selected={addingFilter.key === key}
                  onClick={() => setAddingFilter({ key, values: [], text: '' })}
                />
              ))}
            </div>
            {addingFilter.key === 'text' ? (
              <TextField
                label="Notes, titles or foods contain"
                value={addingFilter.text}
                onChange={(event) => setAddingFilter({ ...addingFilter, text: event.target.value })}
              />
            ) : (
              <MultiChips
                label={`${SPLIT_LABELS[addingFilter.key]} is`}
                options={splitChoices(addingFilter.key, settings)}
                value={addingFilter.values}
                onChange={(values) => setAddingFilter({ ...addingFilter, values })}
              />
            )}
            <div className="flex gap-2">
              <Button
                disabled={addingFilter.key === 'text' ? !addingFilter.text.trim() : addingFilter.values.length === 0}
                onClick={() => {
                  const filter: ReportFilter =
                    addingFilter.key === 'text'
                      ? { key: 'text', text: addingFilter.text.trim() }
                      : { key: addingFilter.key, values: addingFilter.values };
                  onChange({ ...spec, filters: [...spec.filters, filter] });
                  setAddingFilter(null);
                }}
              >
                Add
              </Button>
              <Button variant="ghost" onClick={() => setAddingFilter(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="self-start"
            disabled={measures.length === 0}
            onClick={() => setAddingFilter({ key: splits[0] ?? 'text', values: [], text: '' })}
          >
            <Plus className="size-4" strokeWidth={2.75} />
            Add filter
          </Button>
        )}
      </Section>
    </>
  );

  const chartSection = (
    <Section title="Chart">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Chart type">
        {CHART_TYPES.map((chart) => {
          const problem = chartProblem(spec, chart);
          const Icon = CHART_ICONS[chart];
          const selected = spec.chart === chart;
          return (
            <button
              key={chart}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={problem ? true : undefined}
              title={problem ?? undefined}
              onClick={() => {
                if (!problem) onChange(withChart(spec, chart));
              }}
              className={cn(
                'flex h-20 flex-col items-center justify-center gap-1 rounded-tile border text-caption font-semibold transition-colors',
                selected
                  ? 'border-primary bg-primary-soft text-on-primary-soft'
                  : 'border-line bg-raised text-ink-2 hover:bg-surface',
                problem && !selected && 'cursor-not-allowed opacity-40',
              )}
            >
              <Icon className="size-5" strokeWidth={2.5} />
              {CHART_TYPE_LABELS[chart]}
              {suggested === chart && <span className="text-[10px] font-medium uppercase text-primary">Suggested</span>}
            </button>
          );
        })}
      </div>
    </Section>
  );

  const canCompare =
    !spec.splitBy &&
    spec.chart !== 'donut' &&
    spec.chart !== 'heatmap' &&
    spec.chart !== 'histogram' &&
    spec.chart !== 'rhythm';
  const moreSection = (
    <Section title="Options">
      <Switch
        label="7-day average"
        checked={spec.options.average === 7}
        disabled={spec.bucket !== 'day'}
        onChange={(on) => onChange({ ...spec, options: { ...spec.options, average: on ? 7 : undefined } })}
      />
      <Switch
        label="Cumulative"
        checked={Boolean(spec.options.cumulative)}
        disabled={spec.bucket === 'hour' || spec.bucket === 'weekday'}
        onChange={(on) => onChange({ ...spec, options: { ...spec.options, cumulative: on } })}
      />
      <Switch
        label="Show empty days"
        checked={spec.options.emptyDays !== false}
        onChange={(on) => onChange({ ...spec, options: { ...spec.options, emptyDays: on } })}
      />
      <Switch
        label="Stack"
        checked={spec.options.stack !== false}
        disabled={measures.length < 2 && !spec.splitBy}
        onChange={(on) => onChange({ ...spec, options: { ...spec.options, stack: on } })}
      />
      <Switch
        label="Compare with the previous period"
        checked={spec.compare === 'previous'}
        disabled={!canCompare}
        onChange={(on) => onChange({ ...spec, compare: on ? 'previous' : undefined })}
      />
    </Section>
  );

  const sections: Record<SectionKey, ReactNode> = {
    measure: measureSection,
    range: rangeSection,
    split: splitSection,
    chart: chartSection,
    more: moreSection,
  };

  return (
    <div className="flex flex-col gap-4 md:grid md:grid-cols-[320px_minmax(0,1fr)] md:items-start md:gap-6">
      <div className="md:order-2 md:sticky md:top-6">{preview}</div>
      <div className="flex flex-col gap-4 md:order-1">
        <div className="md:hidden">
          <Segmented<SectionKey> label="Builder section" value={section} onChange={setSection} options={SECTIONS} />
        </div>
        <div className="flex flex-col gap-6 md:max-h-[calc(100vh-10rem)] md:overflow-y-auto md:pr-1">
          <div className="md:hidden">{sections[section]}</div>
          <div className="hidden flex-col gap-6 md:flex">
            {measureSection}
            {rangeSection}
            {splitSection}
            {chartSection}
            {moreSection}
          </div>
        </div>
        {footer}
      </div>
    </div>
  );
}
