# Stage 7: Stats and Insights

## Status (2026-10-08)

Built on branch `stage-2`, on web and mobile (pulled ahead of Stages 4 and 6):

- [x] Range picker **7d / 30d / All** (All runs from birth). Web keeps it in the URL (`/stats?range=30d`).
- [x] `statsReport` in `domain/stats`, built on `bucketByDay` and `summariseDay`. Averages use finished days only, from the first day anything was logged, so empty days before tracking began don't lower them. When only today has entries, it says it's showing today so far.
- [x] **Sleep:** per day, night (uses the night window), naps per day, longest stretch, average wake window (gaps between sleeps under 12h). Chart: night and naps stacked per day.
- [x] **Feeds:** per day, average gap between feed starts, left/right balance by time, downtime per feed (timed feeds only, since imports have no downtime), bottle per day. Chart: breast and bottle stacked.
- [x] **Nappies:** wet and dirty per day, the 14 most recent poo colours. Chart: wet-only and dirty stacked.
- [x] **Pump** (only when there was pumping): per day, sessions per day, left/right yield. Chart: volume per day.
- [x] Ranges longer than 31 days chart weekly averages ("weekly avg" on the chart).
- [x] `listEventsBetween` pages through ranges larger than Supabase's 1,000-row limit.
- [x] Tests: domain tables (ranges, gaps, weekly bars, averages, first-day trimming, today-only, imports), API paging, a mobile component test, Playwright on phone and desktop.
- [x] **Baby sex** (`babies.sex`: female, male or not set), chosen when adding a baby and in Settings → Baby.
- [x] **Growth** card (all growth entries, not limited by the range): weight, length and head, each with the latest value, its WHO percentile ("51st", "below 1st", "above 99th") and a chart of every measurement against the WHO 3rd/15th/50th/85th/97th percentile curves by age in months. Imperial shows lb and in. Without a sex it still charts the measurements and asks for the sex in Settings.
- [x] WHO data: `domain/growth/who-lms.ts`, the L/M/S values for 0–24 months from the CDC's public-domain WHO data files (https://www.cdc.gov/growthcharts/who-data-files.htm), interpolated between months. Percentiles use the standard LMS formula; tests check them against the published 5th/95th values.

## Later

- WHO percentiles beyond 2 years (the CDC files stop at 24 months; the WHO tables run to 5 years).
- Downtime trend over time, colour history beyond the latest 14.
- Food intake correlations, if Stage 6 ships.
