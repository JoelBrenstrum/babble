import type { BabbleClient, BabyRow, Family, SavedReport } from '@babble/api';
import { useReportData } from '@babble/api/react';
import { reportMeta, specMeasures } from '@babble/domain';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Avatar } from '@/components/avatar';
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
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={report.name}
      onPress={() => router.push(`/reports/${report.id}`)}
    >
      <ReportCard
        result={data.result}
        units={data.settings.units}
        title={report.name}
        meta={reportMeta(report.spec)}
        icon={GROUP_ICONS[group]}
        group={group}
        compact
        loading={data.loading}
        right={author ? <Avatar name={author} /> : undefined}
      />
    </Pressable>
  );
}
