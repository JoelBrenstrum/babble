import { toBabbleError } from '@babble/api';
import { useNow, useReportData, useReportMutations, useReports } from '@babble/api/react';
import { familyHasFeature } from '@babble/config';
import {
  rangeNeedsPlus,
  REPORT_RANGE_LABELS,
  REPORT_RANGE_PRESETS,
  reportMeta,
  specMeasures,
  type ReportRangePreset,
  type ReportSpec,
} from '@babble/domain';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { PageHeader } from '#/components/shell/page-header';
import { Button } from '#/components/ui/button';
import { ConfirmPanel } from '#/components/ui/confirm-panel';
import { EmptyState } from '#/components/ui/empty-state';
import { Segmented } from '#/components/ui/segmented';
import { PageSpinner } from '#/components/ui/spinner';
import { StatusMessage } from '#/components/ui/status';
import { useToast } from '#/components/ui/toast';
import { PlusBadge, PlusDialog } from '#/features/plus-dialog';
import { downloadCsv, ReportCard } from '#/features/reports/report-card';
import { GROUP_ICONS } from '#/features/reports/report-icons';
import { ReportMenu } from '#/features/reports/report-menu';

export const Route = createFileRoute('/_app/reports/$reportId/')({
  component: ReportView,
});

function ReportView() {
  const { babble, baby, family, canLog } = Route.useRouteContext();
  const { reportId } = Route.useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const now = useNow(60_000);
  const reports = useReports(babble.client, family.id);
  const report = reports.data?.find((item) => item.id === reportId) ?? null;
  const mutations = useReportMutations(babble.client, family.id);
  const [range, setRange] = useState<ReportRangePreset | null>(null);
  const [compare, setCompare] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pitching, setPitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const longRangesLocked = !familyHasFeature(babble.config.billingEnabled, family.plan, 'insights');

  const spec: ReportSpec | null = report
    ? {
        ...report.spec,
        range: range ? { preset: range } : report.spec.range,
        compare: compare === null ? report.spec.compare : compare ? 'previous' : undefined,
      }
    : null;
  const rangeLocked = spec ? longRangesLocked && rangeNeedsPlus(spec.range) : false;
  const data = useReportData(
    babble.client,
    baby,
    family,
    spec ??
      report?.spec ?? {
        version: 1,
        range: { preset: '7d' },
        bucket: 'day',
        series: [],
        chart: 'bar',
        filters: [],
        options: {},
      },
    now,
    {
      enabled: Boolean(spec) && !rangeLocked,
    },
  );

  if (reports.isPending) return <PageSpinner />;
  if (!report || !spec) {
    return (
      <EmptyState title="Report not found">
        It may have been deleted.{' '}
        <Link to="/reports" className="font-semibold text-primary underline-offset-4 hover:underline">
          Back to Reports
        </Link>
      </EmptyState>
    );
  }
  const group = specMeasures(spec)[0]?.group ?? 'logging';
  const canCompare = !spec.splitBy && !['donut', 'heatmap', 'histogram', 'rhythm'].includes(spec.chart);

  const run = async (action: () => Promise<unknown>, done?: () => void) => {
    setError(null);
    try {
      await action();
      done?.();
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  };

  const menu = (
    <ReportMenu
      label="Report actions"
      items={[
        ...(canLog
          ? [
              { label: 'Edit', onSelect: () => void navigate({ to: '/reports/$reportId/edit', params: { reportId } }) },
              {
                label: 'Duplicate',
                onSelect: () =>
                  void run(
                    () => mutations.create.mutateAsync({ name: `${report.name} copy`, spec: report.spec }),
                    () => toast({ message: 'Report duplicated' }),
                  ),
              },
            ]
          : []),
        {
          label: 'Export CSV',
          onSelect: () => data.result && downloadCsv(data.result, data.settings.units, report.name),
        },
        ...(canLog ? [{ label: 'Delete', destructive: true, onSelect: () => setConfirming(true) }] : []),
      ]}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader backTo={{ to: '/reports' }} title={report.name} subtitle={reportMeta(spec)} />
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <div className="flex flex-col gap-3">
        <div className="w-full sm:max-w-xl">
          <Segmented<ReportRangePreset>
            label="Range"
            value={'preset' in spec.range ? spec.range.preset : null}
            options={REPORT_RANGE_PRESETS.map((preset) => ({
              value: preset,
              label: REPORT_RANGE_LABELS[preset].replace(' days', 'd').replace(' months', 'm'),
            }))}
            onChange={(next) => {
              if (longRangesLocked && rangeNeedsPlus({ preset: next })) return setPitching(true);
              setRange(next);
            }}
          />
        </div>
        {longRangesLocked && (
          <p className="flex items-center gap-2 text-caption text-ink-3">
            <PlusBadge /> 90 days, 6 months and all time
          </p>
        )}
      </div>
      <ReportCard
        result={rangeLocked ? null : data.result}
        units={data.settings.units}
        title={report.name}
        meta={reportMeta(spec)}
        icon={GROUP_ICONS[group]}
        group={group}
        size="l"
        loading={data.loading}
        menu={menu}
        headingId="report-title"
        footer={
          rangeLocked ? (
            <p className="text-center text-meta text-ink-3">Ranges over 30 days are part of Babble Plus.</p>
          ) : canCompare ? (
            <label className="flex h-10 items-center justify-between gap-3 text-body">
              Compare with the previous{' '}
              {'preset' in spec.range ? REPORT_RANGE_LABELS[spec.range.preset].toLowerCase() : 'period'}
              <input
                type="checkbox"
                role="switch"
                aria-checked={spec.compare === 'previous'}
                className="size-5 accent-primary"
                checked={spec.compare === 'previous'}
                onChange={(event) => setCompare(event.target.checked)}
              />
            </label>
          ) : undefined
        }
      />
      {confirming && (
        <ConfirmPanel
          label="Delete this report"
          message={`Delete "${report.name}" for everyone in the family?`}
          confirmLabel="Delete"
          loading={mutations.remove.isPending}
          onConfirm={() =>
            void run(
              () => mutations.remove.mutateAsync(report.id),
              () => void navigate({ to: '/reports' }),
            )
          }
          onCancel={() => setConfirming(false)}
        />
      )}
      {pitching && <PlusDialog feature="insights" onClose={() => setPitching(false)} />}
      {!canLog && (
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => data.result && downloadCsv(data.result, data.settings.units, report.name)}
        >
          Export CSV
        </Button>
      )}
    </div>
  );
}
