import { useNow, useReports } from '@babble/api/react';
import { canSaveReport, FREE_REPORT_LIMIT } from '@babble/config';
import { REPORT_TEMPLATES, templateName } from '@babble/domain';
import { router } from 'expo-router';
import { ChartSpline, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { PageSpinner } from '@/components/page-spinner';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { TEMPLATE_ICONS } from '@/features/reports/report-icons';
import { SavedReportCard } from '@/features/reports/saved-report-card';
import { useBabble } from '@/lib/babble';
import { useTokenColor } from '@/lib/theme';
import { useCanLog } from '@/lib/use-can-log';
import { useReadyState, type ReadyState } from '@/lib/use-onboarding';

export default function ReportsScreen() {
  const ready = useReadyState();
  if (!ready) return null;
  return <ReportsContent baby={ready.baby} family={ready.family} />;
}

function ReportsContent({ baby, family }: Pick<ReadyState, 'baby' | 'family'>) {
  const { client, config } = useBabble();
  const canLog = useCanLog();
  const now = useNow(60_000);
  const reports = useReports(client, family.id);
  const iconColor = useTokenColor('--primary');
  const saved = reports.data ?? [];
  const limited = config.billingEnabled && !canSaveReport(config.billingEnabled, family.plan, Number.MAX_SAFE_INTEGER);
  const meta = limited
    ? `${saved.length} of ${FREE_REPORT_LIMIT} saved · shared with everyone in the family`
    : 'Shared with everyone in the family';
  return (
    <Screen edges={['top']}>
      <ScreenHeader title="Reports" />
      <View className="gap-6">
        <Text className="font-sans text-meta text-ink-2">{meta}</Text>
        {canLog && (
          <View className="gap-2">
            <Text className="font-semibold text-label text-ink-2">Start from</Text>
            <View className="flex-row flex-wrap gap-2">
              {REPORT_TEMPLATES.map((template) => {
                const Icon = TEMPLATE_ICONS[template.icon];
                return (
                  <Pressable
                    key={template.key}
                    accessibilityRole="link"
                    onPress={() => router.push({ pathname: '/reports/new', params: { template: template.key } })}
                    className="h-11 flex-row items-center gap-2 rounded-chip border border-line bg-raised px-4 active:bg-surface"
                  >
                    <Icon size={16} color={iconColor} strokeWidth={2.75} />
                    <Text className="font-semibold text-label text-ink">{templateName(template, baby.name)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="font-sans text-caption text-ink-3">
              Build your own with measures, splits and filters on the web app.
            </Text>
          </View>
        )}
        <View className="gap-4">
          <Text accessibilityRole="header" className="font-bold text-heading text-ink">
            Saved
          </Text>
          {reports.isPending ? (
            <PageSpinner />
          ) : saved.length === 0 ? (
            <EmptyState
              icon={ChartSpline}
              title="No reports yet"
              body={canLog ? 'Start from a template above.' : 'Reports a carer saves will show here.'}
              action={
                canLog ? (
                  <Button
                    icon={<Plus size={18} color="white" strokeWidth={2.75} />}
                    onPress={() =>
                      router.push({ pathname: '/reports/new', params: { template: REPORT_TEMPLATES[0]!.key } })
                    }
                  >
                    Start from a template
                  </Button>
                ) : undefined
              }
            />
          ) : (
            saved.map((report) => (
              <SavedReportCard key={report.id} client={client} baby={baby} family={family} report={report} now={now} />
            ))
          )}
        </View>
      </View>
    </Screen>
  );
}
