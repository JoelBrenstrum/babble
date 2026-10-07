# Stage 3: Timeline

**Goal:** see how the baby is tracking, day by day and week by week.

## Scope

- `bucketByDay(events, timezone, dayStartMinutes)` in `domain`. Splits events that cross a day boundary when computing totals. Handles DST.
- Timeline day view and week view (see [ui.md](../ui.md#12-history-daily))
- Day start setting (midnight or a chosen time)
- Night window setting (e.g. 19:00–07:00) for the day/night sleep split, which Stats also uses

## Tests

- Bucketing at the day start boundary, with DST transitions, sleep crossing the boundary, and a custom day start
