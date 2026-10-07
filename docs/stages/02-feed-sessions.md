# Stage 2: Feed and Pump Sessions

**Goal:** the headline feature. Detailed session breakdowns with downtime, resuming, and nap prompts.

## Scope

- `summariseSegments(segments, { mergeGapSec })` in `domain`. Rules are in [data-model.md](../data-model.md#timed-segments-and-downtime). Used by breast feed and pump.
- Merge threshold setting (default 15s)
- Session states: running / paused / ended. A paused session auto-ends after `auto_end_paused_session_min` (default 30), with `ended_at` set to the end of the last segment.
- **Resume the latest feed only:** the Resume button appears only on the most recent feed, and only if it's a breast feed with no newer feed (breast or bottle) after it. Resuming adds a new segment, and the gap shows as downtime.
- Editing a session: change a segment's side or duration, or a downtime's duration. Timestamps are recomputed in order from the session start.
- **Feed ↔ nap prompts** (confirmed requirement, designed in `design/Phone Flows.dc.html`: `prompt-endnap`, `prompt-startnap`):
  - **Starting a feed while a nap is running** (starting a breastfeed timer, or logging a bottle) asks "End Olivia's nap?" with **End now**, **End at feed start** and **Keep sleeping**.
  - **Finishing a feed** (finishing a breastfeed, or saving a bottle) asks "Is Olivia asleep?" with **Start nap now**, **Asleep since feed end (3:34 am)** and **Not now**. Not asked if a nap is already running.
  - Pumping never prompts, since it's the parent's session rather than the baby's.
  - The prompt is a bottom sheet on phones and a dialog on desktop, and it never blocks: dismissing it does nothing.

## Edge cases to cover

- Switching sides within the threshold: no downtime row
- Pausing and resuming the same side above the threshold: `Left · Downtime · Left`
- A session crossing midnight or the day start
- Two caregivers pressing switch at the same moment (the RPC must be idempotent per segment)
- Clock skew between devices: server time is the source of truth for RPC actions

## Tests

- Table-driven tests for `summariseSegments`, segment-edit recomputation, and resume eligibility

## Status (2026-10-07)

Built on branch `stage-2`, on web and mobile:

- [x] `summariseSegments` (downtime rows, merge threshold, same-side continuation, live idle time while paused) and the session breakdown on the timer and entry screens: "Total feeding 22m 55s · lost 3m 02s"
- [x] Segment editor for saved feeds and pumps: change a side, change any side or downtime duration, add or remove rows. Times are recalculated in order from the start (`editableRowsToSegments`).
- [x] Resume the latest feed: `resume_feed` RPC enforces "most recent feed, nothing else running". The Resume button shows only when that's true.
- [x] Paused feeds and pumps auto-finish after the configured time (checked by the apps every minute; ends at the last segment end).
- [x] Feed ↔ nap prompts: starting a breastfeed or logging a bottle during a nap asks "End Olivia's nap?"; finishing a breastfeed or logging a bottle with no nap running asks "Is Olivia asleep?". `start_session` and `end_session` accept a time for "End at feed start" / "Asleep since feed end".
- [x] Settings → Tracking: units, "ignore gaps shorter than", "finish paused feeds after".
- [x] Tests: 14 new pgTAP assertions (92 total), domain table tests, web/mobile component tests, Playwright for nap prompts, resume and segment editing.

Deferred: auto-finishing paused sessions happens when an app is open, not on the server (a server job arrives with Stage 4's scheduler).
