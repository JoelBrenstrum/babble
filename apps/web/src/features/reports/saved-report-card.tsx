import type { SavedReport } from '@babble/api';
import { useReportData } from '@babble/api/react';
import { reportMeta, specMeasures } from '@babble/domain';
import type { BabbleClient, BabyRow, Family } from '@babble/api';
import { Link } from '@tanstack/react-router';
import { Avatar } from '#/components/ui/avatar';
import { ReportCard } from './report-card';
import { GROUP_ICONS } from './report-icons';

export function SavedReportCard({
  client,
  baby,
  family,
  report,
  now,
}: {
  client: BabbleClient;
  baby: Pick<BabyRow, 'id' | 'timezone' | 'day_start_minutes' | 'birth_date'>;
  family: Family;
  report: SavedReport;
  now: Date;
}) {
  const data = useReportData(client, baby, family, report.spec, now);
  const group = specMeasures(report.spec)[0]?.group ?? 'logging';
  const author = family.members.find((member) => member.user_id === report.createdBy)?.display_name;
  return (
    <Link
      to="/reports/$reportId"
      params={{ reportId: report.id }}
      className="block rounded-card outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <ReportCard
        result={data.result}
        units={data.settings.units}
        title={report.name}
        meta={reportMeta(report.spec)}
        icon={GROUP_ICONS[group]}
        group={group}
        size="s"
        loading={data.loading}
        className="h-full transition-colors hover:bg-surface"
        menu={author ? <Avatar name={author} className="size-7 text-caption" /> : undefined}
      />
    </Link>
  );
}
