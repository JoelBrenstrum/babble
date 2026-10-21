import { babySettingsQuery, eventListQuery, eventsBetweenQuery } from '@babble/api';
import {
  type TimelineLink,
  growthReport,
  PATTERNS_CAPTION,
  STATS_RANGES,
  statsCaption,
  statsInputs,
  statsOptions,
  statsReport,
  type StatsRange,
} from '@babble/domain';
import { sampleStatsReport } from '@babble/api/fixtures';
import { familyHasFeature } from '@babble/config';
import { type InsightsState, useInsights, useNow, useSettled, useUnits } from '@babble/api/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ChartColumn } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { EmptyState } from '@/components/empty-state';
import { PageSpinner } from '@/components/page-spinner';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { GrowthCard } from '@/features/stats/growth-card';
import { StatsCards } from '@/features/stats/stats-cards';
import { WeeklySummaryCard } from '@/features/stats/weekly-summary';
import { PlusTeaser } from '@/features/plus-teaser';
import { PlusMask } from '@/features/plus-mask';
import { useBabble } from '@/lib/babble';
import { useReadyState, type ReadyState } from '@/lib/use-onboarding';

export default function StatsTab() {
  const ready = useReadyState();
  if (!ready) return null;
  return <StatsContent baby={ready.baby} family={ready.family} />;
}

function StatsContent({ baby, family }: Pick<ReadyState, 'baby' | 'family'>) {
  const { client, config } = useBabble();
  const now = useNow(60_000);
  const units = useUnits(client, baby.id);
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const [range, setRange] = useState<StatsRange>('7d');
  const { from, to } = statsInputs(range, baby, now);
  const insights = useInsights(client, config.billingEnabled, baby, family, now);
  const sampleOnly = range === 'all' && insights.locked;
  const events = useQuery({
    ...eventsBetweenQuery(client, baby.id, from, to),
    enabled: !sampleOnly,
    placeholderData: keepPreviousData,
  });
  const loading = events.isPlaceholderData && !sampleOnly;
  const shownRange = useSettled(range, !loading);
  const { todayKey, keys } = statsInputs(shownRange, baby, now);
  const growth = useQuery(eventListQuery(client, baby.id, ['growth']));
  const sample = useMemo(() => (sampleOnly ? sampleStatsReport(now) : null), [sampleOnly, now]);

  const report =
    sample ??
    (events.data && settings
      ? statsReport(events.data, keys, todayKey, now, statsOptions(baby, settings, units))
      : null);

  const empty = !sample && !events.data?.length;

  return (
    <Screen edges={['top']}>
      <View className="gap-8">
        <Text className="font-bold text-title text-ink">Stats</Text>
        <View className="gap-4">
          <View className="gap-1">
            <Text accessibilityRole="header" className="font-bold text-heading text-ink">
              Daily stats
            </Text>
            {report && !sample && !empty && (
              <Text className="font-sans text-meta text-ink-2">{statsCaption(report)}</Text>
            )}
          </View>
          <Segmented<StatsRange> value={range} onChange={setRange} options={STATS_RANGES} />
          {!report ? (
            <PageSpinner />
          ) : empty ? (
            <EmptyState
              icon={ChartColumn}
              title="Nothing to chart yet"
              body="Stats for sleep, feeds and nappies appear once you start logging."
            />
          ) : (
            <PlusMask
              locked={Boolean(sample)}
              feature="insights"
              title="All-time stats"
              body={`Charts and averages for every day since ${baby.name} was born are part of Babble Plus.`}
            >
              <View style={{ opacity: loading ? 0.6 : 1 }}>
                <StatsCards cards={report.cards} onOpenTimeline={sample ? undefined : openTimeline} />
              </View>
            </PlusMask>
          )}
        </View>
        {growth.data && (growth.data.length > 0 || (events.data?.length ?? 0) > 0) && (
          <GrowthCard
            report={growthReport(
              growth.data,
              { birthDate: baby.birth_date, sex: baby.sex, timeZone: baby.timezone },
              units,
              familyHasFeature(config.billingEnabled, family.plan, 'predictions') ? now : undefined,
            )}
            babyName={baby.name}
            timeZone={baby.timezone}
            plusBadge={config.billingEnabled}
          />
        )}
        <Insights state={insights} babyName={baby.name} plusBadges={config.billingEnabled} />
      </View>
    </Screen>
  );
}

function Insights({ state, babyName, plusBadges }: { state: InsightsState; babyName: string; plusBadges: boolean }) {
  if (state.locked) {
    return (
      <PlusTeaser
        feature="insights"
        title="Patterns"
        body={`See ${babyName}'s wake windows, how night sleep is stretching out, how breastfeeds are changing, how far apart feeds are, when feeds bunch up into clusters, and a weekly summary of what changed.`}
      />
    );
  }
  const { report } = state;
  if (!report) return null;
  const cards = [report.feeds, report.spacing, report.clusters, report.wake, report.night].filter(
    (card) => card !== null,
  );
  if (!report.weekly && cards.length === 0) return null;
  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text accessibilityRole="header" className="font-bold text-heading text-ink">
          Patterns
        </Text>
        <Text className="font-sans text-meta text-ink-2">{PATTERNS_CAPTION}</Text>
      </View>
      {report.weekly && <WeeklySummaryCard summary={report.weekly} plusBadge={plusBadges} />}
      {cards.length > 0 && <StatsCards cards={cards} plusBadges={plusBadges} onOpenTimeline={openTimeline} />}
    </View>
  );
}

function openTimeline(link: TimelineLink) {
  router.navigate({ pathname: '/timeline', params: { ...link } });
}
