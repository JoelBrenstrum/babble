# Stage 3: Timeline

**Goal:** see how the baby is tracking, day by day and week by week.

## Scope

- `bucketByDay(events, timezone, dayStartMinutes)` in `domain`. Splits events that cross a day boundary when computing totals. Handles DST.
- Timeline day view and week view (see [ui.md](../ui.md#12-history-daily))
- Day start setting (midnight or a chosen time)
- Night window setting (e.g. 19:00–07:00) for the day/night sleep split, which Stats also uses

## Tests

- Bucketing at the day start boundary, with DST transitions, sleep crossing the boundary, and a custom day start

## Status (2026-10-08)

Built on branch `stage-2`, on web and mobile:

- [x] `bucketByDay`, `dayLayout` and `hourTicks` in `domain/timeline`. Days run from day start to day start in the baby's timezone, so DST days are 23 or 25 hours and ticks are spaced by real time. Sleep that crosses the boundary appears in both days, clipped, with square ends where it continues.
- [x] Day view: Sleep, Feeds (left/right side bars, bottle pills), Nappy (pills with poo colour) and Pump lanes (pump lane only when there was pumping), hour ticks every 3h, a "now" line on today. Markers close together are staggered so they don't overlap. Tapping a block opens the entry (or the timer if it's still running).
- [x] Day totals: Sleep (naps, night, longest), Feeds (left, right, bottle), Nappies (wet, dirty, last), Pump (when there was any). Desktop shows the timeline and totals side by side.
- [x] 7d view: the 7 days ending on the chosen day (today by default) as columns of sleep blocks, feed ticks and nappy dots; tap a day to open it. Summary strip (average sleep, longest stretch, feeds/day) averages finished days only, so today's partial day doesn't drag it down. Daily totals table with an average column.
- [x] ‹ › moves by a day or by 7 days and stops at today. Web keeps the view and date in the URL (`/timeline?view=7d&date=2026-10-05`).
- [x] Settings → Tracking → Night (default 19:00–07:00) splits sleep into night and naps. Day start was already in Settings.
- [x] Tests: domain tables for bucketing, DST (spring-forward ticks, 25-hour fall-back day), custom day start, night split, totals and labels; API range query; a mobile component test; Playwright on phone and desktop.

Not on the timeline: growth and custom events (they have their own lists).
