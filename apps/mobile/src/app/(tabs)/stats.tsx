import { babySettingsQuery, eventListQuery, eventsBetweenQuery } from '@babble/api';
import { dayKeyFor, dayWindow, growthReport, rangeDays, statsReport, type StatsRange } from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { ChartColumn } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { EmptyState } from '@/components/empty-state';
import { PageSpinner } from '@/components/page-spinner';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { GrowthCard } from '@/features/stats/growth-card';
import { StatsCards } from '@/features/stats/stats-cards';
import { useBabble } from '@/lib/babble';
import { useUnits } from '@/lib/use-events';
import { useNow } from '@/lib/use-now';
import { useReadyState } from '@/lib/use-onboarding';

export default function StatsTab() {
  const ready = useReadyState();
  if (!ready) return null;
  return <StatsContent baby={ready.baby} />;
}

function StatsContent({ baby }: Pick<NonNullable<ReturnType<typeof useReadyState>>, 'baby'>) {
  const { client } = useBabble();
  const now = useNow(60_000);
  const units = useUnits(client, baby.id);
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const [range, setRange] = useState<StatsRange>('7d');
  const todayKey = dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes);
  const keys = rangeDays(range, todayKey, baby.birth_date);
  const from = dayWindow(keys[0]!, baby.timezone, baby.day_start_minutes).start.toISOString();
  const to = dayWindow(todayKey, baby.timezone, baby.day_start_minutes).end.toISOString();
  const events = useQuery(eventsBetweenQuery(client, baby.id, from, to));
  const growth = useQuery(eventListQuery(client, baby.id, ['growth']));

  const report =
    events.data && settings
      ? statsReport(events.data, keys, todayKey, now, {
          timeZone: baby.timezone,
          dayStartMinutes: baby.day_start_minutes,
          nightStartMinutes: settings.night_start_minutes,
          nightEndMinutes: settings.night_end_minutes,
          mergeGapMs: settings.downtime_merge_threshold_sec * 1000,
          units,
        })
      : null;

  return (
    <Screen edges={['top']}>
      <View className="gap-4">
        <Text className="font-bold text-title text-ink">Stats</Text>
        <Segmented<StatsRange>
          value={range}
          onChange={setRange}
          options={[
            { value: '7d', label: '7d' },
            { value: '30d', label: '30d' },
            { value: 'all', label: 'All' },
          ]}
        />
        {report && (
          <Text className="font-sans text-meta text-ink-2">
            {report.todayOnly
              ? 'Showing today so far. Daily averages start once a full day has been logged.'
              : `Daily averages over ${report.days} finished ${report.days === 1 ? 'day' : 'days'}; today is charted but not averaged.`}
          </Text>
        )}
        {!report ? (
          <PageSpinner />
        ) : events.data!.length === 0 ? (
          <EmptyState
            icon={ChartColumn}
            title="Nothing to chart yet"
            body="Stats for sleep, feeds and nappies appear once you start logging."
          />
        ) : (
          <StatsCards cards={report.cards} />
        )}
        {growth.data && (
          <GrowthCard
            report={growthReport(
              growth.data,
              { birthDate: baby.birth_date, sex: baby.sex, timeZone: baby.timezone },
              units,
            )}
            babyName={baby.name}
            timeZone={baby.timezone}
          />
        )}
      </View>
    </Screen>
  );
}
