import { emptySpec, templateByKey } from '@babble/domain';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { PageHeader } from '#/components/shell/page-header';
import { ReportEditor } from '#/features/reports/report-editor';

export const Route = createFileRoute('/_app/reports/new')({
  validateSearch: (search: Record<string, unknown>): { template?: string } => ({
    template: typeof search.template === 'string' ? search.template : undefined,
  }),
  component: NewReport,
});

function NewReport() {
  const context = Route.useRouteContext();
  const { template } = Route.useSearch();
  if (!context.canLog) return <Navigate to="/reports" replace />;
  const spec = (template && templateByKey(template)?.spec) || emptySpec();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader backTo={{ to: '/reports' }} title="New report" />
      <ReportEditor key={template ?? 'blank'} context={context} initialSpec={spec} existing={null} />
    </div>
  );
}
