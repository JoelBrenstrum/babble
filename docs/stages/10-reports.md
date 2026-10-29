# Stage 10: Reports and dashboard

## Status (2026-10-29)

Built on branch `feat/reports`, phases 1 to 4 and the mobile viewer. The Claude Design prompt is [design-prompt-reports.md](../design-prompt-reports.md) and the design is in [docs/design](../design/README.md): `Reports.dc.html` for the screens, `Report Chart.dc.html` for the chart types, `Reports Screens.dc.html` as the index.

- [x] **Domain** (`packages/domain/src/reports/`): the versioned spec and parser, 38 measures in 8 groups, 19 splits, text and value filters, day, week, month, hour-of-day and weekday buckets, `runReport`, the previous-period comparison, the heatmap grid, histogram bins, rhythm rows, chart fit rules and suggestions, 12 templates, suggested names, line, area and donut geometry, CSV.
- [x] **Data**: `reports` table with set-based RLS, realtime, and a `before insert` trigger that holds a free family to 2 saved reports (`PL008`). Editing never counts.
- [x] **API**: `listReports`, `createReport`, `updateReport`, `deleteReport`, a realtime subscription, `useReports`, `useReportMutations` and `useReportData`, which loads the range (plus the previous period when comparing) with `listEventsBetween` and runs the report.
- [x] **Web**: `/reports` (templates and saved cards with live charts), `/reports/new`, `/reports/$id` (range override, compare switch, a menu with edit, duplicate, CSV and delete) and `/reports/$id/edit`. The builder has the seven sections on desktop and five tabs on phones. All nine chart types. Saving shows the free limit with "See Plus" and "Or replace one". Reports is in the desktop sidebar and linked from Stats. Playwright covers the whole flow on phone and desktop.
- [x] **Mobile**: the Reports screen (templates and saved cards), creating a report from a template, and the viewer with the range picker, compare switch and delete. All nine chart types with `react-native-svg`. Reports is linked from Stats.
- [ ] **Mobile builder**: measures, splits and filters are edited on the web for now; the phone-sheet design is ready.
- [ ] **Dashboard** (phase 6), export as PNG, comparing two babies, public links.

## Goal

Stats answers the questions we thought of. Reports lets a family ask their own: "how much is Olivia sleeping at night, week by week?", "what time of day do feeds bunch up?", "who logs the nappies?", "is bottle intake creeping up?". A report is a question (what to measure, over what time, split how), a chart type, and a name. Reports are saved per family, shared with every carer, and later arranged into a dashboard alongside the prebuilt cards Stats already has.

**Free:** the builder is open to everyone, so people see what it can do. A free family can **save 2 reports**. Saving a third shows the Plus pitch and offers to replace one. **Plus:** unlimited saved reports. The existing rule that all-time ranges are Plus (`insights`) still applies inside the builder, so a free family builds over the last 30 days.

## What other builders do, and what to take

- **Actual Budget** has a Reports page with prebuilt reports (net worth, cash flow, spending) and a custom report editor: pick a graph type (table, bar, line, area, donut), group by (category, group, payee, account, interval), date range, filters built from the same conditions as its rules, and toggles like "show empty rows" and "show hidden". A custom report saves with a name and lands on a dashboard where cards can be moved and resized, with text cards between them, and the dashboard exports as JSON. Take: a small set of graph types that each suit one shape of question; "split by" as the main lever; saving straight to a dashboard; cards that are either prebuilt or custom with the same frame.
- **Metabase and Grafana** separate the _question_ from the _visualisation_, suggest a chart from the shape of the answer, and compose dashboards from saved questions. Take: the spec is data (JSON), the chart is chosen for it, and the dashboard references specs rather than copying them.
- **Huckleberry** has only fixed charts, but its 24-hour sleep chart (days as rows, hours across) is the one parents screenshot. Take: the **rhythm heatmap** as a first-class chart type, not an afterthought.

Keep it simpler than all of them. No query language, no formulas. A report is a few menus and a live preview.

## The report spec

Stored as JSON in `reports.spec`, versioned so old reports keep working. Everything else (figures, captions, chart geometry) is derived from it by pure functions in `@babble/domain/reports`.

```ts
interface ReportSpec {
  version: 1;
  range: { preset: '7d' | '14d' | '30d' | '90d' | '6m' | 'all' } | { from: string; to: string };
  bucket: 'day' | 'week' | 'month' | 'hour' | 'weekday';
  series: ReportSeries[]; // 1 to 4
  splitBy?: SplitKey; // one dimension; makes stacked bars, stacked areas, donuts and heatmap rows
  chart: 'bar' | 'line' | 'area' | 'donut' | 'number' | 'table' | 'heatmap' | 'histogram' | 'rhythm';
  compare?: 'previous' | 'baby'; // the same range one period earlier, or another baby in the family
  filters: ReportFilter[];
  options: { average?: 7 | 14; cumulative?: boolean; emptyDays?: boolean; stack?: boolean };
}

interface ReportSeries {
  measure: MeasureId; // 'sleep.total', 'feeds.bottleMl', 'nappies.dirty', ...
  aggregate?: 'sum' | 'avg' | 'count' | 'median' | 'min' | 'max'; // defaults per measure
  label?: string;
}
```

**Measures** come from a catalogue, each with a unit (`h`, `min`, `ml`, `g`, `mm`, count, `%`), a default aggregate, the chart types it suits and the splits it allows. The first cut, all derivable from `DaySummary` and the detail tables:

| Group   | Measures                                                                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sleep   | time asleep, night sleep, nap time, naps, longest stretch, wake window, time to fall asleep, sleeps woken by a carer                                              |
| Feeds   | feeds, breastfeeds, bottles, time on the breast, left, right, idle, per feed, gap between feeds, longest gap, bottle ml, ml per bottle, breastfeeds with downtime |
| Nappies | nappies, wet, dirty, both, rashes, time between nappies                                                                                                           |
| Pump    | sessions, ml, left ml, right ml, ml per session                                                                                                                   |
| Solids  | meals, foods, new foods tried                                                                                                                                     |
| Growth  | weight, length, head, weight percentile, gain per week (growth is never bucketed by hour or weekday)                                                              |
| Custom  | events (count), filtered by title                                                                                                                                 |
| Logging | entries, by carer, by device (chair vs phone), entries added more than an hour late (the gap between `created_at` and `started_at`)                               |

**Splits** (one at a time): sleep location, fall-asleep speed, start mood, end mood, bottle content, breast side, nappy kind (wet, dirty, both), wet size, poo size, poo colour, poo texture, solids amount, solids reaction, carer, device, source (manual or imported), weekday, hour of day, day vs night (the night window).

**Filters** narrow the events before measuring, with the same keys as splits plus free text on notes and custom titles: "sleeps in the pram only", "bottles of formula only", "feeds logged by Sam", "nappies with a rash".

**Buckets:** `day` is the default and uses the baby's day start. `week` and `month` average or sum per the measure. `hour` and `weekday` fold the range onto a clock or a week (feeds per hour of day across the last 30 days), which is where rhythms show.

## Chart types and when each one fits

| Chart         | Shape of the question                                        | Example                                                                           |
| ------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Bar**       | A total per bucket, one or more series side by side          | Feeds per day, breast and bottle; nappies per day, wet and dirty stacked          |
| **Line**      | A trend, with an optional 7 or 14 day average on top         | Bottle ml per day; wake window per day; weight percentile per week                |
| **Area**      | How a total is made up over time                             | Night sleep vs naps, stacked; left vs right vs idle per feed                      |
| **Donut**     | The split of one total, with the total in the middle         | Sleep by location; bottle content; poo colours; who logs what                     |
| **Number**    | One figure, the change on the previous period, a sparkline   | Average night sleep this week; longest stretch; ml pumped this month              |
| **Table**     | The numbers behind any chart, exportable as CSV              | Buckets down, series across, with totals and averages                             |
| **Heatmap**   | When something happens: buckets by hour, days as rows        | Feeds by hour across 30 days; sleep by hour; nappies by hour                      |
| **Histogram** | How a duration or amount is distributed                      | Nap lengths; feed durations; wake windows; gaps between feeds                     |
| **Rhythm**    | The day as blocks, one row per day (the Timeline's day view) | Sleep and feed blocks for the last 14 days, so the pattern settling in is visible |

The builder suggests a chart from the series and bucket (one measure split by a category over `all` suggests a donut; a duration with no bucket suggests a histogram; an `hour` bucket suggests a heatmap) and only offers the types that fit. Every chart carries the same frame as today's stats cards: title, figures row, chart, caption, and a readout per bar or point that works for screen readers and keyboards (`barLines` and `nextBarIndex` already do this for bars).

## Prebuilt reports

Templates expressed as specs, under "Start from" in the builder and on the empty Reports page. Opening one shows it immediately; editing it clones it into a custom report. Later the current Stats cards can be re-expressed as templates too, so there's one engine.

- **Night and naps** — area, stacked, 30d, night sleep + nap time, 7-day average.
- **When Olivia sleeps** — heatmap, sleep by hour, 30d.
- **When feeds happen** — heatmap, feeds by hour, 30d.
- **Where Olivia sleeps** — donut, sleeps split by location, 30d.
- **Feeds per day** — bar, breastfeeds + bottles stacked, 30d.
- **Bottle intake** — line, bottle ml per day with a 7-day average, 90d.
- **Nap lengths** — histogram, nap durations, 30d.
- **Wake windows** — line, median wake window per day, 30d.
- **Nappy output** — bar, wet + dirty + both stacked, 14d.
- **Who logs what** — donut, entries split by carer, 30d.
- **Weight gain** — bar, gain per week, all.
- **Last 14 days** — rhythm, sleep and feeds, 14d.

## Dashboard (phase 4)

A per-family grid of cards, shared with every carer. Cards are either **prebuilt** (today's stats cards: sleep, feeds, breast time, nappies, pump, growth, and the Patterns cards) or **custom** (a saved report). Each card has a size (1 or 2 columns, on desktop up to 3) and a position; the grid stacks to one column on phones. "Add card" lists prebuilt cards and saved reports; the dashboard can also hold a short text card for notes ("Started formula top-ups 12 Oct"). Reordering is drag on desktop and a move sheet on phone. The dashboard replaces the top of Stats: the range picker stays and applies to prebuilt cards, while custom cards use their own range.

```
dashboards       id, family_id, name, created_at
dashboard_cards  id, dashboard_id, kind (prebuilt|report|text), ref (card key or report id), body?, size, position
```

One dashboard per family to start; the table allows more later. Free families keep the dashboard but can only pin their 2 saved reports.

## Build

1. **Domain** (`packages/domain/src/reports/`): spec types and a `parseReportSpec` that rejects unknown versions; the measure catalogue with units, aggregates and allowed charts; `runReport(spec, events, settings, now) => ReportResult` (buckets, series values, totals, the comparison, and the readout strings); `suggestChart(spec)`; `templates`; CSV from a result; geometry helpers for lines, areas, donuts and heatmaps as pure functions returning points and arcs. Tests for every measure and bucket, day-start and night-window edges, imports without downtime, empty ranges, comparisons, and each template.
2. **Data** (`supabase`): `reports (id, family_id, baby_id, name, spec jsonb, created_by, created_at, updated_at, deleted_at)` with RLS by family membership. A `before insert` trigger enforces the free limit from the family plan so a modified client can't exceed it; the client checks too for the pitch. Realtime so a partner sees a new report.
3. **API** (`@babble/api`): `useReports`, `useReport`, `saveReport`, `deleteReport`, a `useReportData(spec)` that resolves the range to a time window, loads events with `listEventsBetween` (already pages past 1,000 rows) and runs the report. Reports over long ranges run in a web worker on web if the main thread stutters; measure first.
4. **Web**: `/reports` (list, templates, "New report"), `/reports/new` and `/reports/$id` (the viewer with Edit), `/reports/$id/edit` (the builder). The builder is a settings panel beside a live preview on desktop and a stepped bottom sheet over the preview on phones. Chart renderers in `features/reports/charts/` as SVG, one component per type, taking the geometry from the domain. Save dialog with name, the 2-report limit and the replace flow. Stats links to Reports; Reports links back to a day in History from any bar.
5. **Mobile**: the viewer and list first, then the builder using the same steps as the phone web sheet. Charts with `react-native-svg`, sharing the domain geometry.
6. **Dashboard**: tables, "Add card", sizes, reorder, the text card, and Stats showing the dashboard above the Patterns section.
7. **Later**: export a card as a PNG for sharing; compare two babies on one chart; a public read-only link for a report (opt-in, per report); a Home Assistant sensor from a `number` report.

## Open questions

- Whether `compare: 'previous'` draws the earlier period as a faded second series or as a delta on the figures only. Start with the figures and a faded line on line charts.
- Whether custom reports pick a baby or always follow the Stats baby switcher. Start by following the switcher, storing `baby_id` null; a family with two babies may want pinned ones later.
- How the free limit treats a report edited into something else. Editing never counts; only new saves do.
