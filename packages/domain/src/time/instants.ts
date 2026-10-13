import { DAY_MS } from './constants';

export const ms = (iso: string): number => Date.parse(iso);

export const compareIso = (a: string, b: string): number => Date.parse(a) - Date.parse(b);

interface Started {
  startedAt: string;
}

export const byStartedAtAsc = (a: Started, b: Started): number => compareIso(a.startedAt, b.startedAt);

export const byStartedAtDesc = (a: Started, b: Started): number => compareIso(b.startedAt, a.startedAt);

export const daysUntil = (iso: string, now: Date): number => Math.round((Date.parse(iso) - now.getTime()) / DAY_MS);
