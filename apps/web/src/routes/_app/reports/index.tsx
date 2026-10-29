import { useNow, useReports } from '@babble/api/react';
import { canSaveReport, FREE_REPORT_LIMIT } from '@babble/config';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChartSpline, Plus } from 'lucide-react';
import { buttonClassName } from '#/components/ui/button';
import { EmptyState } from '#/components/ui/empty-state';
import { PageSpinner } from '#/components/ui/spinner';
import { SavedReportCard } from '#/features/reports/saved-report-card';
import { TemplateChips } from '#/features/reports/template-chips';

export const Route = createFileRoute('/_app/reports/')({
  component: ReportsPage,
});

function ReportsPage() {
  const { babble, baby, family, canLog } = Route.useRouteContext();
  const now = useNow(60_000);
  const reports = useReports(babble.client, family.id);
  const saved = reports.data ?? [];
  const limited =
    babble.config.billingEnabled && !canSaveReport(babble.config.billingEnabled, family.plan, Number.MAX_SAFE_INTEGER);
  const meta = limited
    ? `${saved.length} of ${FREE_REPORT_LIMIT} saved · shared with everyone in the family`
    : 'Shared with everyone in the family';

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title font-bold">Reports</h1>
          <p className="mt-1 text-meta text-ink-2">{meta}</p>
        </div>
        {canLog && (
          <Link
            to="/reports/new"
            search={{ template: undefined }}
            className={buttonClassName({ variant: 'primary', size: 'md' })}
          >
            <Plus className="size-4" strokeWidth={2.75} />
            New report
          </Link>
        )}
      </div>
      {canLog && <TemplateChips babyName={baby.name} />}
      <section className="flex flex-col gap-4" aria-labelledby="reports-saved">
        <h2 id="reports-saved" className="text-heading font-bold">
          Saved
        </h2>
        {reports.isPending ? (
          <PageSpinner />
        ) : saved.length === 0 ? (
          <EmptyState icon={ChartSpline} title="No reports yet">
            {canLog ? 'Start from a template or build your own.' : 'Reports a carer saves will show here.'}
          </EmptyState>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {saved.map((report) => (
              <SavedReportCard
                key={report.id}
                client={babble.client}
                baby={baby}
                family={family}
                report={report}
                now={now}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
