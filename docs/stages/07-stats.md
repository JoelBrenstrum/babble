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
- [x] **Breastfeed trend** (Plus, `insights`): a Patterns card averaging the last 7 days per breastfeed (total, left, right, idle), feeding time a day and the change on last week; the chart shows the rolling 7-day average for each of the last 14 days. Finished feeds logged in babble or brought in from a babble export count; Huckleberry imports are left out because they have no idle time. Needs 3 feeds in the last week.
- [x] **Feed spacing** (Plus, `insights`): a Patterns card with the typical gap between feeds by day and overnight, the change on last week and the longest gap last night; the chart shows the typical daytime gap for each of the last 14 days. Gaps run start to start across breastfeeds and bottles, a feed starting within 20 minutes of the last one ending counts as a top-up, and gaps of 12 hours or more are ignored. Needs 6 daytime gaps in the last week.
- [x] **Growth estimate for today** (Plus, `predictions`): with 3 or more measurements, the last 6 are fitted with a line of best fit and projected to today, for up to 90 days after the last measurement. With a sex set, the fit runs on WHO z-scores so the estimate bends with the growth curve; otherwise it's a straight line on the values. Shown as a dashed point on the chart and an "Estimate for today" panel.
- [x] **Growth milestones** (Plus, `predictions`): the same trend gives the next two round numbers within 120 days and roughly when they'll be reached, e.g. "Next: 6 kg around 28 Oct · 7 kg around 9 Nov". Weight is every 1 kg (2 lb) and length every 5 cm (2 in); head size has none.

## Later

- WHO percentiles beyond 2 years (the CDC files stop at 24 months; the WHO tables run to 5 years).
- Colour history beyond the latest 14.
- Food intake correlations, if Stage 6 ships.
