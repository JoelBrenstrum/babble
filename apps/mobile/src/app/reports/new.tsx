import { toBabbleError } from '@babble/api';
import { useNow, useReportData, useReportMutations, useReports } from '@babble/api/react';
import { canSaveReport, familyHasFeature, REPORT_LIMIT_MESSAGE, type PlusFeature } from '@babble/config';
import { rangeNeedsPlus, reportMeta, specMeasures, templateByKey, templateName } from '@babble/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { SingleChips } from '@/components/chips';
import { PlusBadge, PlusDialog } from '@/components/plus';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';
import { ReportCard } from '@/features/reports/report-card';
import { GROUP_ICONS } from '@/features/reports/report-icons';
import { useBabble } from '@/lib/babble';
import { useReadyState, type ReadyState } from '@/lib/use-onboarding';

export default function NewReportScreen() {
  const { template } = useLocalSearchParams<{ template?: string }>();
  const ready = useReadyState();
  const found = template ? templateByKey(template) : null;
  if (!ready) return null;
  if (!found) {
    return (
      <Screen>
        <ScreenHeader title="New report" />
        <StatusMessage tone="info">Pick a template from the Reports screen.</StatusMessage>
      </Screen>
    );
  }
  return <NewReportContent key={found.key} template={found} baby={ready.baby} family={ready.family} />;
}

function NewReportContent({
  template,
  baby,
  family,
}: { template: NonNullable<ReturnType<typeof templateByKey>> } & Pick<ReadyState, 'baby' | 'family'>) {
  const { client, config } = useBabble();
  const now = useNow(60_000);
  const spec = template.spec;
  const [name, setName] = useState(templateName(template, baby.name));
  const [replacing, setReplacing] = useState<string | null>(null);
  const [pitching, setPitching] = useState<PlusFeature | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reports = useReports(client, family.id).data ?? [];
  const mutations = useReportMutations(client, family.id);
  const rangeLocked = !familyHasFeature(config.billingEnabled, family.plan, 'insights') && rangeNeedsPlus(spec.range);
  const data = useReportData(client, baby, family, spec, now, { enabled: !rangeLocked });
  const group = specMeasures(spec)[0]?.group ?? 'logging';
  const atLimit = !canSaveReport(config.billingEnabled, family.plan, reports.length);
  const saving = mutations.create.isPending || mutations.update.isPending;

  const save = async () => {
    setError(null);
    try {
      const reportId =
        atLimit && replacing
          ? (await mutations.update.mutateAsync({ id: replacing, name: name.trim(), spec }), replacing)
          : (await mutations.create.mutateAsync({ name: name.trim(), spec })).id;
      router.replace(`/reports/${reportId}`);
    } catch (caught) {
      setError(toBabbleError(caught).message);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="New report" />
      <View className="gap-5">
        <ReportCard
          result={rangeLocked ? null : data.result}
          units={data.settings.units}
          title={name.trim() || templateName(template, baby.name)}
          meta={reportMeta(spec)}
          icon={GROUP_ICONS[group]}
          group={group}
          loading={data.loading}
          footer={
            rangeLocked ? (
              <Text className="text-center font-sans text-meta text-ink-3">
                Ranges over 30 days are part of Babble Plus.
              </Text>
            ) : undefined
          }
        />
        <Text className="font-sans text-meta text-ink-2">{template.description}</Text>
        <TextField label="Name" value={name} onChangeText={setName} maxLength={80} hint="Shared with your family." />
        {atLimit && (
          <View className="gap-3 rounded-tile bg-caution-soft p-4">
            <View className="flex-row items-center gap-2">
              <Text className="font-semibold text-label text-on-caution">You've saved {reports.length} reports</Text>
              <PlusBadge />
            </View>
            <Text className="font-sans text-meta text-on-caution">{REPORT_LIMIT_MESSAGE}</Text>
            <Button variant="secondary" onPress={() => setPitching('unlimited_reports')}>
              See Plus
            </Button>
            <SingleChips
              label="Or replace one"
              options={reports.map((report) => ({ value: report.id, label: report.name }))}
              value={replacing}
              onChange={setReplacing}
            />
          </View>
        )}
        {error && <StatusMessage tone="danger">{error}</StatusMessage>}
        <Button
          size="lg"
          loading={saving}
          disabled={!name.trim() || rangeLocked || (atLimit && !replacing)}
          onPress={() => void save()}
        >
          {atLimit ? 'Replace' : 'Save'}
        </Button>
        {rangeLocked && (
          <Button variant="secondary" onPress={() => setPitching('insights')}>
            See what Plus adds
          </Button>
        )}
      </View>
      <PlusDialog feature={pitching} onClose={() => setPitching(null)} />
    </Screen>
  );
}
