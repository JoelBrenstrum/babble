import { useReports } from '@babble/api/react';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { PageHeader } from '#/components/shell/page-header';
import { EmptyState } from '#/components/ui/empty-state';
import { PageSpinner } from '#/components/ui/spinner';
import { ReportEditor } from '#/features/reports/report-editor';

export const Route = createFileRoute('/_app/reports/$reportId/edit')({
  component: EditReport,
});

function EditReport() {
  const context = Route.useRouteContext();
  const { reportId } = Route.useParams();
  const reports = useReports(context.babble.client, context.family.id);
  if (!context.canLog) return <Navigate to="/reports/$reportId" params={{ reportId }} replace />;
  if (reports.isPending) return <PageSpinner />;
  const report = reports.data?.find((item) => item.id === reportId);
  if (!report) return <EmptyState title="Report not found">It may have been deleted.</EmptyState>;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader backTo={{ to: '/reports/$reportId', params: { reportId } }} title={`Edit ${report.name}`} />
      <ReportEditor context={context} initialSpec={report.spec} existing={report} />
    </div>
  );
}
