import { toBabbleError, type SavedReport } from '@babble/api';
import { useNow, useReportData, useReportMutations, useReports } from '@babble/api/react';
import { canSaveReport, familyHasFeature } from '@babble/config';
import { rangeNeedsPlus, reportMeta, specMeasures, suggestedName, type ReportSpec } from '@babble/domain';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '#/components/ui/button';
import { PlusDialog } from '#/features/plus-dialog';
import { ReportBuilder } from './report-builder';
import { ReportCard } from './report-card';
import { GROUP_ICONS } from './report-icons';
import { SaveReportDialog } from './save-report-dialog';
import type { Route as AppRoute } from '#/routes/_app';

type AppContext = ReturnType<typeof AppRoute.useRouteContext>;

export function ReportEditor({
  context,
  initialSpec,
  existing,
}: {
  context: Pick<AppContext, 'babble' | 'baby' | 'family'>;
  initialSpec: ReportSpec;
  existing: SavedReport | null;
}) {
  const { babble, baby, family } = context;
  const navigate = useNavigate();
  const now = useNow(60_000);
  const [spec, setSpec] = useState(initialSpec);
  const [saving, setSaving] = useState(false);
  const [pitching, setPitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reports = useReports(babble.client, family.id).data ?? [];
  const mutations = useReportMutations(babble.client, family.id);
  const longRangesLocked = !familyHasFeature(babble.config.billingEnabled, family.plan, 'insights');
  const rangeLocked = longRangesLocked && rangeNeedsPlus(spec.range);
  const data = useReportData(babble.client, baby, family, spec, now, {
    enabled: spec.series.length > 0 && !rangeLocked,
  });
  const group = specMeasures(spec)[0]?.group ?? 'logging';
  const atLimit = !existing && !canSaveReport(babble.config.billingEnabled, family.plan, reports.length);
  const name = existing?.name ?? suggestedName(spec);

  const finish = async (run: () => Promise<string>) => {
    setError(null);
    try {
      const reportId = await run();
      setSaving(false);
      void navigate({ to: '/reports/$reportId', params: { reportId } });
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  };

  const save = (reportName: string) =>
    finish(async () => {
      if (existing) {
        await mutations.update.mutateAsync({ id: existing.id, name: reportName, spec });
        return existing.id;
      }
      return (await mutations.create.mutateAsync({ name: reportName, spec })).id;
    });

  const replace = (reportId: string, reportName: string) =>
    finish(async () => {
      await mutations.update.mutateAsync({ id: reportId, name: reportName, spec });
      return reportId;
    });

  const preview = (
    <ReportCard
      result={spec.series.length === 0 ? null : data.result}
      units={data.settings.units}
      title={name}
      meta={reportMeta(spec)}
      icon={GROUP_ICONS[group]}
      group={group}
      loading={data.loading && spec.series.length > 0}
      footer={
        spec.series.length === 0 ? (
          <p className="text-center text-meta text-ink-3">Pick a measure to see the preview.</p>
        ) : rangeLocked ? (
          <p className="text-center text-meta text-ink-3">Ranges over 30 days are part of Babble Plus.</p>
        ) : undefined
      }
    />
  );

  return (
    <>
      <ReportBuilder
        spec={spec}
        onChange={setSpec}
        settings={data.settings}
        preview={preview}
        longRangesLocked={longRangesLocked}
        onLockedRange={() => setPitching(true)}
        footer={
          <div className="sticky bottom-[calc(var(--spacing-tab-bar)+8px)] flex gap-2 rounded-card bg-raised/95 py-2 backdrop-blur md:static md:bg-transparent md:py-0">
            <Button
              size="lg"
              className="flex-1"
              disabled={spec.series.length === 0 || rangeLocked}
              onClick={() => setSaving(true)}
            >
              {existing ? 'Save changes' : 'Save'}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() =>
                void (existing
                  ? navigate({ to: '/reports/$reportId', params: { reportId: existing.id } })
                  : navigate({ to: '/reports' }))
              }
            >
              Cancel
            </Button>
          </div>
        }
      />
      {saving && (
        <SaveReportDialog
          initialName={name}
          reports={reports}
          atLimit={atLimit}
          saving={mutations.create.isPending || mutations.update.isPending}
          error={error}
          onSave={(reportName) => void save(reportName)}
          onReplace={(reportId, reportName) => void replace(reportId, reportName)}
          onClose={() => {
            setSaving(false);
            setError(null);
          }}
        />
      )}
      {pitching && <PlusDialog feature="insights" onClose={() => setPitching(false)} />}
    </>
  );
}
