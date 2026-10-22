import { nightSettingsFrom, type NightSettingsRow } from '../events/baby-settings';
import type { BabyEvent } from '../events/types';
import { formatDurationShort } from '../format/duration';
import { feedGaps, nightStats, sleepSpans, wakeWindows, type NightStat } from '../stats/insights';
import { median } from '../stats/maths';
import type { InsightSettings } from '../stats/settings';
import { dayKeyFor, dayWindow, shiftDay } from '../time/local-time';
import { isWithinNight, nightWindow } from '../time/night';
import type { TimeWindow } from '../time/windows';
import type { TimelineBaby } from './timeline-model';
import type { TotalCard } from './totals';

export interface GapStats {
  typicalMs: number;
  longestMs: number;
  shortestMs: number;
}

export interface DayRhythm {
  feedSpacing: GapStats | null;
  wakeWindows: GapStats | null;
  night: NightStat | null;
  nightFeedGapMs: number | null;
}

export function dayRhythmWindow(dayKey: string, baby: TimelineBaby, settings: NightSettingsRow): TimeWindow {
  const dayEnd = dayWindow(dayKey, baby.timezone, baby.day_start_minutes).end;
  const nightEnd = nightWindow(dayKey, { timeZone: baby.timezone, ...nightSettingsFrom(settings) }).end;
  return {
    start: dayWindow(shiftDay(dayKey, -1), baby.timezone, baby.day_start_minutes).start,
    end: nightEnd > dayEnd ? nightEnd : dayEnd,
  };
}

function gapStats(values: readonly number[]): GapStats | null {
  const typicalMs = median(values);
  if (typicalMs === null) return null;
  return { typicalMs, longestMs: Math.max(...values), shortestMs: Math.min(...values) };
}

export function dayRhythm(input: {
  events: readonly BabyEvent[];
  dayKey: string;
  now: Date;
  settings: NightSettingsRow;
  baby: TimelineBaby;
}): DayRhythm {
  const { events, dayKey, now, baby } = input;
  const settings: InsightSettings = {
    timeZone: baby.timezone,
    dayStartMinutes: baby.day_start_minutes,
    ...nightSettingsFrom(input.settings),
  };
  const todayKey = dayKeyFor(now.toISOString(), settings.timeZone, settings.dayStartMinutes);
  // Today's own night has not finished, so today reports the one that ended this morning.
  const nightKey = dayKey === todayKey ? shiftDay(dayKey, -1) : dayKey;
  const day = dayWindow(dayKey, settings.timeZone, settings.dayStartMinutes);
  const withinDay = (instant: number) => instant >= day.start.getTime() && instant < day.end.getTime();
  const gaps = feedGaps(events, settings);
  const spans = sleepSpans(events, now);
  const daytimeGaps = gaps.filter(
    (gap) => !gap.night && gap.dayKey === dayKey && !isWithinNight(new Date(gap.start + gap.ms), settings),
  );
  const nightGaps = gaps.filter((gap) => gap.night && gap.dayKey === nightKey).map((gap) => gap.ms);
  return {
    feedSpacing: gapStats(daytimeGaps.map((gap) => gap.ms)),
    wakeWindows: gapStats(
      wakeWindows(spans, settings)
        .filter((window) => withinDay(window.start + window.ms))
        .map((window) => window.ms),
    ),
    night: nightStats(spans, [nightKey], now, settings)[0] ?? null,
    nightFeedGapMs: nightGaps.length ? Math.max(...nightGaps) : null,
  };
}

const orDash = (ms: number | null | undefined) => (ms ? formatDurationShort(ms) : '—');

export function dayRhythmCards(rhythm: DayRhythm, isToday: boolean): TotalCard[] {
  const { feedSpacing, wakeWindows: wake, night, nightFeedGapMs } = rhythm;
  const cards: TotalCard[] = [];
  if (feedSpacing) {
    cards.push({
      key: 'spacing',
      label: 'Feed spacing',
      value: formatDurationShort(feedSpacing.typicalMs),
      details: [
        { label: 'Longest', value: formatDurationShort(feedSpacing.longestMs) },
        { label: 'Shortest', value: formatDurationShort(feedSpacing.shortestMs) },
      ],
    });
  }
  if (wake) {
    cards.push({
      key: 'wake',
      label: 'Wake windows',
      value: formatDurationShort(wake.typicalMs),
      details: [
        { label: 'Longest', value: formatDurationShort(wake.longestMs) },
        { label: 'Shortest', value: formatDurationShort(wake.shortestMs) },
      ],
    });
  }
  if (night || nightFeedGapMs) {
    cards.push({
      key: 'night',
      label: isToday ? 'Last night' : 'Overnight',
      value: orDash(night?.sleepMs),
      details: [
        { label: 'Longest stretch', value: orDash(night?.longestMs) },
        { label: 'Wake-ups', value: night ? String(night.wakeUps) : '—' },
        { label: 'Longest feed gap', value: orDash(nightFeedGapMs) },
      ],
    });
  }
  return cards;
}
