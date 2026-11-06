import type { StatsCard } from '../stats/cards';

export const PREBUILT_CARDS = [
  'sleep',
  'feeds',
  'breast-time',
  'nappies',
  'pump',
  'growth',
  'weekly',
  'wake',
  'night',
  'feed-trend',
  'feed-spacing',
  'cluster-feeds',
] as const;
export type PrebuiltCard = (typeof PREBUILT_CARDS)[number];

export const PREBUILT_LABELS: Record<PrebuiltCard, string> = {
  sleep: 'Sleep',
  feeds: 'Feeds',
  'breast-time': 'Time on the breast',
  nappies: 'Nappies',
  pump: 'Pump',
  growth: 'Growth',
  weekly: 'Weekly summary',
  wake: 'Wake windows',
  night: 'Night sleep',
  'feed-trend': 'Breastfeed trend',
  'feed-spacing': 'Feed spacing',
  'cluster-feeds': 'Cluster feeding',
};

export const PLUS_PREBUILT: readonly PrebuiltCard[] = [
  'weekly',
  'wake',
  'night',
  'feed-trend',
  'feed-spacing',
  'cluster-feeds',
];

export const isStatsCardKey = (card: PrebuiltCard): card is StatsCard['key'] => card !== 'growth' && card !== 'weekly';

export type CardSize = 's' | 'm';

export type DashboardCard =
  | { id: string; kind: 'prebuilt'; card: PrebuiltCard; size: CardSize }
  | { id: string; kind: 'report'; reportId: string; size: CardSize }
  | { id: string; kind: 'text'; body: string; size: CardSize };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type NewDashboardCard = DistributiveOmit<DashboardCard, 'id'>;
export type CardRef = DistributiveOmit<DashboardCard, 'id' | 'size'>;

export interface DashboardLayout {
  version: 1;
  cards: DashboardCard[];
}

export const MAX_DASHBOARD_CARDS = 24;
export const MAX_TEXT_LENGTH = 280;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const sizeOf = (value: unknown): CardSize => (value === 's' ? 's' : 'm');

function parseCard(value: unknown): DashboardCard | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id) return null;
  const size = sizeOf(value.size);
  if (value.kind === 'prebuilt' && (PREBUILT_CARDS as readonly string[]).includes(value.card as string)) {
    return { id: value.id, kind: 'prebuilt', card: value.card as PrebuiltCard, size };
  }
  if (value.kind === 'report' && typeof value.reportId === 'string' && value.reportId) {
    return { id: value.id, kind: 'report', reportId: value.reportId, size };
  }
  if (value.kind === 'text' && typeof value.body === 'string') {
    return { id: value.id, kind: 'text', body: value.body.slice(0, MAX_TEXT_LENGTH), size };
  }
  return null;
}

export function parseDashboardLayout(value: unknown): DashboardLayout | null {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.cards)) return null;
  const seen = new Set<string>();
  const cards = value.cards.flatMap((item) => {
    const card = parseCard(item);
    if (!card || seen.has(card.id)) return [];
    seen.add(card.id);
    return [card];
  });
  return { version: 1, cards: cards.slice(0, MAX_DASHBOARD_CARDS) };
}

export function defaultDashboard(): DashboardLayout {
  return {
    version: 1,
    cards: [
      { id: 'sleep', kind: 'prebuilt', card: 'sleep', size: 's' },
      { id: 'feeds', kind: 'prebuilt', card: 'feeds', size: 's' },
      { id: 'breast-time', kind: 'prebuilt', card: 'breast-time', size: 's' },
      { id: 'nappies', kind: 'prebuilt', card: 'nappies', size: 's' },
      { id: 'pump', kind: 'prebuilt', card: 'pump', size: 's' },
      { id: 'growth', kind: 'prebuilt', card: 'growth', size: 'm' },
    ],
  };
}

const newId = () => `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function addCard(layout: DashboardLayout, card: NewDashboardCard): DashboardLayout {
  if (layout.cards.length >= MAX_DASHBOARD_CARDS) return layout;
  return { ...layout, cards: [...layout.cards, { ...card, id: newId() } as DashboardCard] };
}

export function removeCard(layout: DashboardLayout, id: string): DashboardLayout {
  return { ...layout, cards: layout.cards.filter((card) => card.id !== id) };
}

export function moveCard(layout: DashboardLayout, id: string, direction: -1 | 1): DashboardLayout {
  const index = layout.cards.findIndex((card) => card.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= layout.cards.length) return layout;
  const cards = [...layout.cards];
  const [card] = cards.splice(index, 1);
  cards.splice(target, 0, card!);
  return { ...layout, cards };
}

export function resizeCard(layout: DashboardLayout, id: string, size: CardSize): DashboardLayout {
  return { ...layout, cards: layout.cards.map((card) => (card.id === id ? { ...card, size } : card)) };
}

export function updateText(layout: DashboardLayout, id: string, body: string): DashboardLayout {
  return {
    ...layout,
    cards: layout.cards.map((card) =>
      card.id === id && card.kind === 'text' ? { ...card, body: body.slice(0, MAX_TEXT_LENGTH) } : card,
    ),
  };
}

export function hasCard(layout: DashboardLayout, card: CardRef): boolean {
  return layout.cards.some((item) =>
    item.kind === 'prebuilt' && card.kind === 'prebuilt'
      ? item.card === card.card
      : item.kind === 'report' && card.kind === 'report'
        ? item.reportId === card.reportId
        : false,
  );
}

export function pruneReports(layout: DashboardLayout, reportIds: ReadonlySet<string>): DashboardLayout {
  const cards = layout.cards.filter((card) => card.kind !== 'report' || reportIds.has(card.reportId));
  return cards.length === layout.cards.length ? layout : { ...layout, cards };
}

export function dashboardTouched(layout: DashboardLayout): boolean {
  const base = defaultDashboard();
  return (
    layout.cards.length !== base.cards.length ||
    layout.cards.some((card, index) => JSON.stringify(card) !== JSON.stringify(base.cards[index]))
  );
}
