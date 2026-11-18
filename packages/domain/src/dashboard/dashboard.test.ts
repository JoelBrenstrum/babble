import { describe, expect, it } from 'vitest';
import type { StatsCard } from '../stats/cards';
import type { InsightsReport } from '../stats/insights';
import {
  addCard,
  dashboardTouched,
  defaultDashboard,
  hasCard,
  MAX_DASHBOARD_CARDS,
  moveCard,
  parseDashboardLayout,
  patternCard,
  prebuiltHasContent,
  pruneReports,
  removeCard,
  resizeCard,
  shownDashboard,
  updateText,
} from './dashboard';

describe('parseDashboardLayout', () => {
  it('keeps readable cards, drops duplicates and unknown kinds, and bounds text', () => {
    const parsed = parseDashboardLayout({
      version: 1,
      cards: [
        { id: 'a', kind: 'prebuilt', card: 'sleep', size: 's' },
        { id: 'a', kind: 'prebuilt', card: 'feeds' },
        { id: 'b', kind: 'report', reportId: 'r1', size: 'huge' },
        { id: 'c', kind: 'text', body: 'x'.repeat(300) },
        { id: 'd', kind: 'prebuilt', card: 'nope' },
        { kind: 'text', body: 'no id' },
      ],
    });
    expect(parsed?.cards.map((card) => card.id)).toEqual(['a', 'b', 'c']);
    expect(parsed?.cards[1]).toMatchObject({ size: 'm' });
    expect(parsed!.cards[2]).toMatchObject({ body: 'x'.repeat(280) });
    expect(parseDashboardLayout({ version: 2, cards: [] })).toBeNull();
  });
});

describe('layout edits', () => {
  it('adds, moves, resizes, edits text, removes and prunes', () => {
    let layout = defaultDashboard();
    expect(dashboardTouched(layout)).toBe(false);
    layout = addCard(layout, { kind: 'report', reportId: 'r1', size: 's' });
    layout = addCard(layout, { kind: 'text', body: 'Started formula top-ups', size: 's' });
    expect(layout.cards).toHaveLength(8);
    expect(hasCard(layout, { kind: 'report', reportId: 'r1' })).toBe(true);
    expect(hasCard(layout, { kind: 'prebuilt', card: 'sleep' })).toBe(true);
    expect(hasCard(layout, { kind: 'prebuilt', card: 'wake' })).toBe(false);
    expect(dashboardTouched(layout)).toBe(true);

    const reportCard = layout.cards[6]!;
    layout = moveCard(layout, reportCard.id, -1);
    expect(layout.cards[5]).toBe(reportCard);
    expect(moveCard(layout, layout.cards[0]!.id, -1)).toBe(layout);

    layout = resizeCard(layout, reportCard.id, 'm');
    expect(layout.cards[5]).toMatchObject({ size: 'm' });

    const text = layout.cards[7]!;
    layout = updateText(layout, text.id, 'Changed');
    expect(layout.cards[7]).toMatchObject({ body: 'Changed' });

    layout = pruneReports(layout, new Set());
    expect(layout.cards.some((card) => card.kind === 'report')).toBe(false);
    layout = removeCard(layout, text.id);
    expect(layout.cards).toHaveLength(6);
  });

  it('refuses more cards than the limit', () => {
    let layout = defaultDashboard();
    for (let count = 0; count < MAX_DASHBOARD_CARDS + 2; count += 1)
      layout = addCard(layout, { kind: 'text', body: String(count), size: 's' });
    expect(layout.cards).toHaveLength(MAX_DASHBOARD_CARDS);
  });
});

describe('shownDashboard', () => {
  const stored = addCard(defaultDashboard(), { kind: 'report', reportId: 'r1', size: 's' });

  it('waits for the stored layout and falls back to the default when it cannot load', () => {
    expect(shownDashboard(undefined, false, new Set())).toBeNull();
    expect(shownDashboard(undefined, true, null)).toEqual(defaultDashboard());
  });

  it('keeps report cards until the saved reports are known', () => {
    expect(shownDashboard(stored, false, null)).toBe(stored);
    expect(shownDashboard(stored, false, new Set(['r1']))).toBe(stored);
    expect(shownDashboard(stored, false, new Set())!.cards).toHaveLength(stored.cards.length - 1);
  });
});

describe('prebuiltHasContent', () => {
  const card = (key: StatsCard['key']) => ({ key }) as StatsCard;
  const report: InsightsReport = {
    feeds: null,
    spacing: null,
    clusters: null,
    wake: card('wake'),
    night: null,
    weekly: null,
  };
  const none = { stats: null, growth: null, patterns: null };

  it('finds a pattern card by its key', () => {
    expect(patternCard(report, 'wake')).toBe(report.wake);
    expect(patternCard(report, 'night')).toBeNull();
  });

  it('shows stats cards and growth only when there is data for them', () => {
    expect(prebuiltHasContent('sleep', none)).toBe(false);
    expect(prebuiltHasContent('sleep', { ...none, stats: { cards: [card('sleep')] } })).toBe(true);
    expect(prebuiltHasContent('feeds', { ...none, stats: { cards: [card('sleep')] } })).toBe(false);
    expect(prebuiltHasContent('growth', none)).toBe(false);
    expect(prebuiltHasContent('growth', { ...none, growth: {} })).toBe(true);
  });

  it('shows Plus cards when locked, and otherwise only the patterns that exist', () => {
    expect(prebuiltHasContent('wake', none)).toBe(false);
    expect(prebuiltHasContent('night', { ...none, patterns: { locked: true } })).toBe(true);
    const unlocked = { ...none, patterns: { locked: false as const, report } };
    expect(prebuiltHasContent('wake', unlocked)).toBe(true);
    expect(prebuiltHasContent('night', unlocked)).toBe(false);
    expect(prebuiltHasContent('weekly', unlocked)).toBe(false);
  });
});
