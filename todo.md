# Todo

Ideas to add to Babble. Each item gets picked up and folded into the relevant stage plan in [docs/stages/](docs/stages/).

- [ ] **Growth: show previous measurements while capturing.** The growth form lists earlier weight, length and head circumference entries, so a new value can be checked against the last ones.
- [ ] **Timed events: record who finished them and when.** For events with a start and end (sleep, breastfeed, pump, timed custom), store who marked them finished and the actual time they pressed it. That time is kept separately from `ended_at`, because the end time can be backdated or edited. Show it on the event detail (e.g. "Ended by Jane at 14:32"), next to "Started by". Probably `ended_by` and `end_recorded_at` columns on `events`.
- [ ] **Feed stats: show left, right and downtime separately.** Wherever feed time is charted or summed (Stats, History timeline and totals, feed list rows), draw left and right in their own colours (`feed-left` and `feed-right` tokens) and downtime as its own neutral, dashed "idle" style (`downtime` token), rather than one feed block. Totals should split the same way, e.g. "L 42m · R 38m · idle 9m".
