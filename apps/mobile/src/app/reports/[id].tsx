import { toBabbleError } from '@babble/api';
import { useNow, useReportData, useReportMutations, useReports } from '@babble/api/react';
import { familyHasFeature } from '@babble/config';
import {
  rangeNeedsPlus,
  REPORT_RANGE_PRESETS,
  reportMeta,
  specMeasures,
  type ReportRangePreset,
  type ReportSpec,
} from '@babble/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { CheckRow } from '@/components/chips';
import { PageSpinner } from '@/components/page-spinner';
import { PlusDialog } from '@/components/plus';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Segmented } from '@/components/segmented';
import { StatusMessage } from '@/components/status-message';
import { ReportCard } from '@/features/reports/report-card';
import { GROUP_ICONS } from '@/features/reports/report-icons';
import { useBabble } from '@/lib/babble';
import { useTokenColor } from '@/lib/theme';
import { useCanLog } from '@/lib/use-can-log';
import { useReadyState, type ReadyState } from '@/lib/use-onboarding';

const RANGE_OPTIONS = REPORT_RANGE_PRESETS.map((preset) => ({
  value: preset,
  label: preset === 'all' ? 'All' : preset,
}));

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ready = useReadyState();
  if (!ready || !id) return null;
  return <ReportContent id={id} baby={ready.baby} family={ready.family} />;
}

function ReportContent({ id, baby, family }: { id: string } & Pick<ReadyState, 'baby' | 'family'>) {
  const { client, config } = useBabble();
  const canLog = useCanLog();
  const now = useNow(60_000);
  const reports = useReports(client, family.id);
  const report = reports.data?.find((item) => item.id === id) ?? null;
  const mutations = useReportMutations(client, family.id);
  const [range, setRange] = useState<ReportRangePreset | null>(null);
  const [compare, setCompare] = useState<boolean | null>(null);
  const [pitching, setPitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const danger = useTokenColor('--danger');
  const longRangesLocked = !familyHasFeature(config.billingEnabled, family.plan, 'insights');
  const spec: ReportSpec | null = report
    ? {
        ...report.spec,
        range: range ? { preset: range } : report.spec.range,
        compare: compare === null ? report.spec.compare : compare ? 'previous' : undefined,
      }
    : null;
  const rangeLocked = spec ? longRangesLocked && rangeNeedsPlus(spec.range) : false;
  const data = useReportData(
    client,
    baby,
    family,
    spec ?? { version: 1, range: { preset: '7d' }, bucket: 'day', series: [], chart: 'bar', filters: [], options: {} },
    now,
    {
      enabled: Boolean(spec) && !rangeLocked,
    },
  );

  if (reports.isPending) return <PageSpinner />;
  if (!report || !spec) {
    return (
      <Screen>
        <ScreenHeader title="Report" />
        <StatusMessage tone="danger">This report was deleted.</StatusMessage>
      </Screen>
    );
  }
  const group = specMeasures(spec)[0]?.group ?? 'logging';
  const canCompare = !spec.splitBy && !['donut', 'heatmap', 'histogram', 'rhythm'].includes(spec.chart);

  const confirmDelete = () =>
    Alert.alert(`Delete "${report.name}"?`, 'It will be removed for everyone in the family.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          void mutations.remove
            .mutateAsync(report.id)
            .then(() => router.replace('/reports'))
            .catch((caught: unknown) => setError(toBabbleError(caught).message)),
      },
    ]);

  return (
    <Screen>
      <ScreenHeader
        title={report.name}
        right={
          canLog ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete report"
              onPress={confirmDelete}
              className="size-tap items-center justify-center rounded-full active:bg-surface"
            >
              <Trash2 size={20} color={danger} strokeWidth={2.75} />
            </Pressable>
          ) : undefined
        }
      />
      <View className="gap-4">
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
        <Segmented<ReportRangePreset>
          value={'preset' in spec.range ? spec.range.preset : null}
          options={RANGE_OPTIONS}
          onChange={(next) => {
            if (longRangesLocked && rangeNeedsPlus({ preset: next })) return setPitching(true);
            setRange(next);
          }}
        />
        <ReportCard
          result={rangeLocked ? null : data.result}
          units={data.settings.units}
          title={report.name}
          meta={reportMeta(spec)}
          icon={GROUP_ICONS[group]}
          group={group}
          loading={data.loading}
          footer={
            rangeLocked ? (
              <Text className="text-center font-sans text-meta text-ink-3">
                Ranges over 30 days are part of Babble Plus.
              </Text>
            ) : canCompare ? (
              <CheckRow
                label="Compare with the previous period"
                value={spec.compare === 'previous'}
                onChange={setCompare}
              />
            ) : undefined
          }
        />
        <Text className="font-sans text-caption text-ink-3">
          Edit this report's measures, splits and filters on the web app.
        </Text>
      </View>
      <PlusDialog feature={pitching ? 'insights' : null} onClose={() => setPitching(false)} />
    </Screen>
  );
}
