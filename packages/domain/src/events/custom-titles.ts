import { byStartedAtDesc } from '../time/instants';
import type { BabyEvent } from './types';

export const MAX_CUSTOM_TITLE_LENGTH = 80;
export const MAX_SAVED_CUSTOM_TITLES = 40;

export function normaliseCustomTitle(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, MAX_CUSTOM_TITLE_LENGTH);
}

export function sameCustomTitle(a: string, b: string): boolean {
  return normaliseCustomTitle(a).toLocaleLowerCase() === normaliseCustomTitle(b).toLocaleLowerCase();
}

export function hasCustomTitle(titles: readonly string[], title: string): boolean {
  return titles.some((existing) => sameCustomTitle(existing, title));
}

export function recentCustomTitles(events: readonly BabyEvent[], limit = 8): string[] {
  const titles: string[] = [];
  const latestFirst = events.filter((event) => event.type === 'custom' && !event.deletedAt).sort(byStartedAtDesc);
  for (const event of latestFirst) {
    if (titles.length >= limit) break;
    if (event.type !== 'custom') continue;
    const title = normaliseCustomTitle(event.details.title);
    if (title && !hasCustomTitle(titles, title)) titles.push(title);
  }
  return titles;
}

export function customTitleSuggestions(saved: readonly string[], recent: readonly string[]): string[] {
  return [...saved, ...recent].reduce<string[]>(
    (list, title) => (hasCustomTitle(list, title) ? list : [...list, title]),
    [],
  );
}

export function canSaveCustomTitle(saved: readonly string[], text: string): boolean {
  const title = normaliseCustomTitle(text);
  return title.length > 0 && saved.length < MAX_SAVED_CUSTOM_TITLES && !hasCustomTitle(saved, title);
}

export function matchingCustomTitle(suggestions: readonly string[], text: string): string | null {
  return suggestions.find((title) => sameCustomTitle(title, text)) ?? null;
}
