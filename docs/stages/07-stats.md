# Stage 7 (Phase 2): Stats and Insights

## Candidate insights
- Sleep: total per day, day vs. night sleep (uses the night window), longest stretch, wake windows
- Feeds: count per day, average interval, L/R balance, downtime trend, bottle volume
- Pump: volume per day, L/R yield
- Nappies: wet/dirty counts per day (useful in the early weeks), colour history
- Growth: charts against WHO percentiles
- Food intake correlations, if Stage 6 ships

## Notes
- All aggregation is pure functions in `domain`, built on `bucketByDay`
- Web gets the rich version. Mobile gets a compact summary of cards.
