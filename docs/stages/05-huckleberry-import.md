# Stage 5: Huckleberry CSV Import

**Goal:** bring our Huckleberry history into babble. Can start straight after Stage 1, in parallel with Stage 2.

Import is **CSV-only**. The unofficial API was considered and dropped.

**Status:** the parser and mapper are implemented and unit-tested in `packages/domain/src/huckleberry/` (`parseHuckleberryCsv`). What remains is the import screen, the batch-insert RPC, and the database-side unique index.

## CSV format (confirmed from two real exports, 2026-10-07)

Header: `Type, Start, End, Duration, Start Condition, Start Location, End Condition, Notes, Logged By`

- Times are local, `YYYY-MM-DD HH:MM`, with **no timezone offset** and **minute precision**. The importer takes an IANA timezone (defaulting to the baby's). Ambiguous fall-back times resolve to the earlier instant, and spring-forward gap times shift forward.
- `Duration` is `HH:MM`. When `End` is empty, end = start + duration.
- `Logged By` was empty in both exports and is ignored.
- Notes encode newlines as a literal `\n`.
- **The columns mean different things for each `Type`:**

| Type                          | Start Condition                        | Start Location          | End Condition                                               | Duration       | Maps to                  |
| ----------------------------- | -------------------------------------- | ----------------------- | ----------------------------------------------------------- | -------------- | ------------------------ |
| Feed (breast)                 | Right total `00:35R`                   | `Breast`                | Left total `00:21L`                                         | Total          | `breast_feed` + segments |
| Feed (bottle)                 | `Breast Milk` / `Formula` / other milk | `Bottle`                | Amount `110ml` / `4oz`                                      | —              | `bottle`                 |
| Diaper                        | Texture (`Loose`, `Runny`, ...)        | `Diaper rash` or empty  | `Pee[:size]` / `Poo[:size]` / `Both[, pee:x poo:y]` / `Dry` | **Poo colour** | `nappy`                  |
| Sleep                         | Comma list: fall-asleep times + moods  | Comma list of locations | Comma list: moods + `Woke up child`                         | Total          | `sleep` + details        |
| Pump                          | Left amount `30ml`                     | —                       | Right amount `10ml`                                         | Optional       | `pump` (no segments)     |
| Growth                        | Weight `4.09kg`                        | Length `52cm`           | Head `37.5cm`                                               | —              | `growth`                 |
| Tummy time, Bath              | —                                      | —                       | —                                                           | Optional       | `custom` (title = type)  |
| Potty, Solids, Temp, Medicine |                                        |                         |                                                             |                | skipped, with a reason   |

Unknown types and unparseable rows are skipped with a reason, and unrecognised values within a row produce warnings. Nothing is guessed silently.

## Mapping rules

- **Breast feeds:** the side columns are fixed (Right, then Left), so the order in which sides were fed is lost. Segments are built back-to-back from `Start`, Right then Left, with zero-length sides dropped and no downtime. The event's end = start + sum of sides; Huckleberry's own `End` can be about a minute later because of rounding. Imported feeds are flagged in the UI, which hides downtime and side order for them.
- **Bottle:** `Breast Milk` → `breast_milk`, `Formula` → `formula`. Any other milk type (Tube Feeding, Cow/Goat/Soy Milk, Other) → `other`, with a warning.
- **Nappies:** quantity `small/medium/large` → `little/medium/large`, for both wet and poo. Huckleberry has one colour, which becomes a one-item `poo_colours` (`gray` → `white_grey`). Texture becomes a one-item `poo_textures` (`solid` → `formed`). `Diaper rash` → `rash = true`.
- **Sleep:** `under_10_minutes` / `10-20_minutes` / `long time to fall asleep` → `fall_asleep`. If several are recorded, the first is kept, with a warning. `happy`/`upset` → moods. Locations map one-to-one (`stroller` → `pram`, `on own in bed` → `cot`, `worn or held` → `held`). `Woke up child` → `woken_by_carer`. A sleep with no end time and no duration is skipped.
- **Pump:** Start Condition is always the left amount and End Condition the right amount (confirmed: the lone `30ml` entry was left). Huckleberry's "total only" mode hasn't appeared in an export; if it shows up, it will look like a left-only entry.
- **Activities:** `Tummy time` and `Bath` become custom events, so their history isn't lost, even though activities aren't a tracker.

## Flow

Web only, designed in `design/Web.dc.html` (`import-1`…`import-5`): upload → choose an existing baby **or create a new one**, and confirm the timezone → preview (counts per type, date range, skipped rows with reasons, warnings) → import in batches through an RPC → summary, with a downloadable skipped-rows report.

## Idempotency

`source = huckleberry_csv`, `source_ref = hash(raw row) + "-" + occurrence`. The occurrence index keeps genuinely identical rows distinct (the test export has several). A unique index on `(baby_id, source, source_ref)` means importing a newer export during the switchover only adds new rows.

## Privacy

Real exports are never committed. `__fixtures__/real-week.csv` is a real week with notes replaced, growth values made up, and every date moved back 364 days. `__fixtures__/all-types.csv` is a test export (one of every entry type) with dates shifted the same way.

## Tests

`packages/domain/src/huckleberry/import.test.ts`: every row shape, field parsers, malformed rows, unknown types, timezone conversion, source-ref stability, and both fixtures end to end.

## Status (2026-10-07)

- [x] `import_events(baby_id, events)` RPC: batches of up to 500, skips rows whose `(source, source_ref)` already exist, runs as the caller so RLS applies. pgTAP covered.
- [x] Web import screen (Settings → Data → Import from Huckleberry): choose a CSV, pick the baby and the records' timezone, preview counts/date range/skipped rows/notes, import in batches of 200 with progress, summary with "already in babble" count.
- [x] Imported rows show an "Imported" tag instead of an author; their entry screen says "Imported · date".
- [x] Playwright: import the anonymised fixture, then re-import and confirm nothing is duplicated.

Not built: importing into "a new baby" from the import screen (add the baby first, then import), and the downloadable skipped-rows report.
