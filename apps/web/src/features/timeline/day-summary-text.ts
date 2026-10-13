import type { DayLayout } from '@babble/domain';

const NOUNS: { key: keyof DayLayout; one: string; many: string }[] = [
  { key: 'sleep', one: 'sleep', many: 'sleeps' },
  { key: 'feeds', one: 'feed', many: 'feeds' },
  { key: 'nappies', one: 'nappy', many: 'nappies' },
  { key: 'pumps', one: 'pump', many: 'pumps' },
];

export function daySummaryText(layout: DayLayout | null): string {
  if (!layout) return 'No data for this day';
  const parts = NOUNS.flatMap(({ key, one, many }) => {
    const count = layout[key].length;
    return count > 0 ? [`${count} ${count === 1 ? one : many}`] : [];
  });
  return parts.length > 0 ? parts.join(', ') : 'Nothing logged';
}
