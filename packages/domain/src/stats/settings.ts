import type { Units } from '../events/types';
import type { NightSettings } from '../time/night';

export interface InsightSettings extends NightSettings {
  timeZone: string;
  dayStartMinutes: number;
}

export interface InsightsReportSettings extends InsightSettings {
  mergeGapMs: number;
}

export interface StatsSettings extends InsightsReportSettings {
  units: Units;
}
