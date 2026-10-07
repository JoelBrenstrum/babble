import { babySettingsQuery, eventsBetweenQuery } from '@babble/api';
import {
  bucketByDay,
  countedDays,
  dayKeyFor,
  dayLayout,
  daySummaryStrip,
  dayTotalCards,
  dayWindow,
  formatDayLabel,
  formatDayRange,
  fractionOf,
  hourTicks,
  shiftDay,
  summariseDay,
  summariseWeek,
  lastDays,
  weekSummaryStrip,
  weekTableRows,
} from '@babble/domain';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { PageSpinner } from '@/components/page-spinner';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { DayTimeline } from '@/features/timeline/day-timeline';
import { DayTotals, SummaryStrip, WeekTable } from '@/features/timeline/totals';
import { WeekTimeline } from '@/features/timeline/week-timeline';
import { useBabble } from '@/lib/babble';
import { useTokenColor } from '@/lib/theme';
import { useUnits } from '@/lib/use-events';
import { useNow } from '@/lib/use-now';
import { useReadyState } from '@/lib/use-onboarding';

type View_ = 'day' | '7d';

export default function TimelineTab() {
  const ready = useReadyState();
  if (!ready) return null;
  return <TimelineContent baby={ready.baby} />;
}

function TimelineContent({ baby }: Pick<NonNullable<ReturnType<typeof useReadyState>>, 'baby'>) {
  const { client } = useBabble();
  const now = useNow(60_000);
  const units = useUnits(client, baby.id);
  const settings = useQuery(babySettingsQuery(client, baby.id)).data;
  const ink = useTokenColor('--ink');
  const [view, setView] = useState<View_>('day');
  const [date, setDate] = useState<string | null>(null);

  const todayKey = dayKeyFor(now.toISOString(), baby.timezone, baby.day_start_minutes);
  const dayKey = date && date <= todayKey ? date : todayKey;
  const keys = view === 'day' ? [dayKey] : lastDays(dayKey, 7);
  const from = dayWindow(keys[0]!, baby.timezone, baby.day_start_minutes).start.toISOString();
  const to = dayWindow(keys.at(-1)!, baby.timezone, baby.day_start_minutes).end.toISOString();
  const events = useQuery(eventsBetweenQuery(client, baby.id, from, to));

  const step = view === 'day' ? 1 : 7;
  const previousKey = shiftDay(dayKey, -step);
  const nextKey = shiftDay(dayKey, step) < todayKey ? shiftDay(dayKey, step) : todayKey;
  const canGoNext = dayKey < todayKey;

  const days = bucketByDay(events.data ?? [], keys, baby.timezone, baby.day_start_minutes, now).map((day) => {
    const future = day.dayKey > todayKey;
    return {
      ...day,
      layout: future ? null : dayLayout(day.events, day.window, now),
      summary: future
        ? null
        : summariseDay(day.events, day.window, {
            now,
            night: settings && {
              dayKey: day.dayKey,
              timeZone: baby.timezone,
              startMinutes: settings.night_start_minutes,
              endMinutes: settings.night_end_minutes,
            },
          }),
    };
  });
  const counted = new Set(countedDays(keys, todayKey));
  const week = summariseWeek(days.flatMap((day) => (counted.has(day.dayKey) && day.summary ? [day.summary] : [])));
  const today = days[0]!;

  return (
    <Screen edges={['top']}>
      <View className="gap-4">
        <View className="flex-row items-center justify-between gap-4">
          <Text className="font-bold text-title text-ink">Timeline</Text>
          <View className="w-40">
            <Segmented<View_>
              value={view}
              onChange={setView}
              options={[
                { value: 'day', label: 'Day' },
                { value: '7d', label: '7d' },
              ]}
            />
          </View>
        </View>
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={view === 'day' ? 'Previous day' : 'Previous 7 days'}
            onPress={() => setDate(previousKey)}
            className="h-11 w-11 items-center justify-center rounded-full bg-surface"
          >
            <ChevronLeft size={20} color={ink} strokeWidth={2.75} />
          </Pressable>
          <Text className="font-semibold text-row-title text-ink">
            {view === 'day' ? formatDayLabel(dayKey, todayKey) : formatDayRange(keys)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={view === 'day' ? 'Next day' : 'Next 7 days'}
            accessibilityState={{ disabled: !canGoNext }}
            disabled={!canGoNext}
            onPress={() => setDate(nextKey)}
            className={`h-11 w-11 items-center justify-center rounded-full bg-surface ${canGoNext ? '' : 'opacity-40'}`}
          >
            <ChevronRight size={20} color={ink} strokeWidth={2.75} />
          </Pressable>
        </View>

        {events.isPending ? (
          <PageSpinner />
        ) : view === 'day' ? (
          <>
            <SummaryStrip items={daySummaryStrip(today.summary!)} />
            <DayTimeline
              layout={today.layout!}
              ticks={hourTicks(dayKey, baby.timezone, baby.day_start_minutes, 3)}
              timeZone={baby.timezone}
              units={units}
              now={now}
              nowFrac={dayKey === todayKey ? fractionOf(today.window, now.getTime()) : null}
            />
            <DayTotals cards={dayTotalCards(today.summary!, units, baby.timezone)} />
          </>
        ) : (
          <>
            <SummaryStrip items={weekSummaryStrip(week)} />
            <WeekTimeline
              days={days.map((day) => ({ dayKey: day.dayKey, layout: day.layout }))}
              ticks={hourTicks(keys[0]!, baby.timezone, baby.day_start_minutes, 6)}
              todayKey={todayKey}
              onOpenDay={(key) => {
                setDate(key);
                setView('day');
              }}
            />
            <WeekTable
              dayKeys={keys}
              rows={weekTableRows(
                days.map((day) => day.summary),
                week,
                units,
              )}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
