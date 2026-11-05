import { MINUTE_MS } from '../time/constants';
import type { CustomKind, DraftOfType } from './types';

export const MAX_CUSTOM_TITLE_LENGTH = 80;
export const MAX_SAVED_CUSTOM_TITLES = 40;
export const MAX_CUSTOM_UNIT_LENGTH = 20;
export const MAX_CUSTOM_AMOUNT = 100_000;

export interface CustomTitle {
  title: string;
  kind: CustomKind;
  unit: string | null;
}

export const CUSTOM_KINDS: readonly CustomKind[] = ['note', 'duration', 'amount'];

export const CUSTOM_KIND_LABELS: Record<CustomKind, string> = {
  note: 'Just the time',
  duration: 'Minutes',
  amount: 'Amount',
};

export function normaliseCustomTitle(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, MAX_CUSTOM_TITLE_LENGTH).trimEnd();
}

export function normaliseCustomUnit(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, MAX_CUSTOM_UNIT_LENGTH).trimEnd();
}

export function sameCustomTitle(a: string, b: string): boolean {
  return normaliseCustomTitle(a).toLocaleLowerCase() === normaliseCustomTitle(b).toLocaleLowerCase();
}

export function hasCustomTitle(saved: readonly CustomTitle[], title: string): boolean {
  return saved.some((existing) => sameCustomTitle(existing.title, title));
}

export function customTitleEntry(title: string, kind: CustomKind, unit: string | null): CustomTitle {
  const tidiedUnit = kind === 'amount' ? normaliseCustomUnit(unit ?? '') : '';
  return { title: normaliseCustomTitle(title), kind, unit: tidiedUnit || null };
}

export function canSaveCustomTitle(saved: readonly CustomTitle[], entry: CustomTitle): boolean {
  const tidied = customTitleEntry(entry.title, entry.kind, entry.unit);
  return (
    tidied.title.length > 0 &&
    (tidied.kind !== 'amount' || tidied.unit !== null) &&
    saved.length < MAX_SAVED_CUSTOM_TITLES &&
    !hasCustomTitle(saved, tidied.title)
  );
}

export function matchingCustomTitle(saved: readonly CustomTitle[], text: string): CustomTitle | null {
  return saved.find((entry) => sameCustomTitle(entry.title, text)) ?? null;
}

export function customTitleHint(entry: CustomTitle): string | null {
  if (entry.kind === 'duration') return 'min';
  if (entry.kind === 'amount') return entry.unit;
  return null;
}

export function customMinutes(draft: Pick<DraftOfType<'custom'>, 'startedAt' | 'endedAt'>): number {
  return draft.endedAt ? Math.round((Date.parse(draft.endedAt) - Date.parse(draft.startedAt)) / MINUTE_MS) : 0;
}

export function withCustomMinutes(draft: DraftOfType<'custom'>, minutes: number): DraftOfType<'custom'> {
  return { ...draft, endedAt: new Date(Date.parse(draft.startedAt) + minutes * MINUTE_MS).toISOString() };
}

export function withCustomStart(draft: DraftOfType<'custom'>, startedAt: string): DraftOfType<'custom'> {
  return withCustomMinutes({ ...draft, startedAt }, customMinutes(draft));
}

export function withCustomKind(
  draft: DraftOfType<'custom'>,
  kind: CustomKind,
  unit: string | null = draft.details.unit,
): DraftOfType<'custom'> {
  const details = { ...draft.details, kind };
  if (kind === 'amount') {
    return { ...draft, endedAt: draft.startedAt, details: { ...details, unit } };
  }
  const plain = { ...draft, details: { ...details, amount: null, unit: null } };
  return kind === 'note' ? { ...plain, endedAt: draft.startedAt } : plain;
}

export function withCustomTitle(draft: DraftOfType<'custom'>, saved: CustomTitle | null): DraftOfType<'custom'> {
  if (!saved) return { ...draft, details: { ...draft.details, title: '' } };
  return withCustomKind({ ...draft, details: { ...draft.details, title: saved.title } }, saved.kind, saved.unit);
}

export function formatCustomAmount(amount: number, unit: string | null): string {
  const value = Number(amount.toFixed(2)).toString();
  return unit ? `${value} ${unit}` : value;
}
