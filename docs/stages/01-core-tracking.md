# Stage 1: Core Tracking (Huckleberry parity)

**Goal:** we can stop using Huckleberry for day-to-day logging, on Expo and on the web app at phone size.

## Scope

- Schema: `events` + all detail tables + `timed_segments` + `session_details` (see [data-model.md](../data-model.md))
- Trackers:
  - Sleep: timer + manual entry
  - Breast feed: segment timer with L/R switching and pause (L/R totals; the full downtime breakdown comes in Stage 2), plus manual entry
  - Pump: segment timer with L/R switching and pause, plus amounts on finish, plus manual entry
  - Bottle, nappy (two colours, five sizes, wet size, textures, rash), growth, custom
- Home dashboard, category lists, detail/edit, soft delete with undo
- Realtime: Supabase Realtime → TanStack Query invalidation, so a running timer started by one parent appears for the other
- Web at phone size passes the same logging flows as mobile (Playwright on a phone viewport)

## Design

### Database

- `events` base table and one detail table per type, as in the data model. Every child table carries `event_id` with `on delete cascade`.
- RLS: members of the baby's family can read; owners and caregivers can write. Child tables resolve the family through their event.
- `latest_events` view (`security_invoker`): the most recent non-deleted event per baby and type, for the Home rows.
- **Writes go through RPCs** so the base row, its details and its segments change in one transaction. They run as the caller (`security invoker`), so RLS still applies.
  - `save_event(event jsonb)` creates or updates an event of any type, with its details and segments. Used by every form and later by the Huckleberry import.
  - `start_session(baby_id, type, side)`, `switch_side(event_id, side)`, `pause_session(event_id)`, `resume_session(event_id, side)`, `end_session(event_id)`. Timer actions use **server time**, so two devices agree.
  - Soft delete and undo are plain updates of `events.deleted_at`.
- A partial unique index allows one running event per baby and type. Starting a second feed while one runs returns the existing one instead of failing.
- `events` is added to the `supabase_realtime` publication. Every RPC touches `events.updated_at`, so clients only need to subscribe to `events`.

### Shared logic (pure, unit-tested)

- `packages/domain`: `BabyEvent` (an `EventDraft` plus id, baby, author and timestamps), `validateDraft`, `segmentTotals` (L/R active time), `describeEvent` (a row's title, tinted parts and duration for every list), `formatDuration`, `groupByDay` (using the baby's timezone and day start), unit formatting (metric/imperial), and local-time ↔ UTC conversion for form inputs in the baby's timezone.
- `packages/api`: `rowToEvent` / `draftToPayload` mapping, `listEvents`, `latestEvents`, `runningEvents`, `saveEvent`, session actions, `deleteEvent` / `restoreEvent`, query keys, and `subscribeToBabyEvents` (realtime → callback).

### Screens (both apps)

| Route                | What                                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home                 | Running session cards (breastfeed / pump: side toggle, pause, finish; sleep: end), tracker rows with the last entry, today strip. Tap a row → list; + → add |
| `track/$tracker`     | Category list grouped by day with day totals, + to add, swipe/menu delete with undo                                                                         |
| `track/$tracker/new` | Add flow: start a timer or log a past entry (sleep, breastfeed, pump), or the form (bottle, nappy, growth, custom)                                          |
| `sessions/$id`       | Full timer screen for a running breastfeed, pump or sleep                                                                                                   |
| `events/$id`         | Detail / edit form with delete                                                                                                                              |

Times are shown and entered in the baby's timezone.

## Done when

- Every tracker can be added, edited and deleted on both apps.
- A timer started on one device is visible and controllable on another within a couple of seconds.
- The family is logging in Babble instead of Huckleberry.

## Tests

- `domain`: validation, segment totals, row descriptions, duration and unit formatting, day grouping, timezone conversion
- `api`: row mapping and request shapes
- pgTAP: RLS on every new table, `save_event` for each type, the single-running-session rule, side switching, pause/resume, end, soft delete
- Playwright (phone + desktop): start a feed → switch side → pause → resume → finish; log a nappy; edit and delete with undo

## Status (2026-10-07)

Built on branch `stage-1`:

- [x] Migration: `events`, seven detail tables, `timed_segments`, `session_details`, RLS, `save_event`, session RPCs, `latest_events`, realtime publication. 40 new pgTAP assertions (78 in total).
- [x] Domain: validation, segment totals, row descriptions, day grouping, day windows, day summary, unit and duration formatting, timezone-aware inputs, optimistic `applySessionAction`, tracker helpers.
- [x] API: row ↔ domain mapping, list/latest/running queries, `saveEvent`, session actions, soft delete/restore, realtime subscription.
- [x] Web and mobile: Home (running cards, latest per tracker, today strip), category lists grouped by day, add flows (start a timer or log a past entry), full timer screen, edit/delete with undo, realtime sync.
- [x] Playwright (phone + desktop): breastfeed timer flow; nappy log/edit/delete; undo; a nap started in one browser appears and ends in another.
- [x] Cosmos fixtures for Home, running cards, rows and every form, on both apps.

Known gaps, deferred:

- Desktop web uses full pages for add/edit rather than the designed list + detail split view and dialogs.
- Breastfeeds/pumps with more than two segments can't have individual segments edited yet (Stage 2).
- Rows are deleted from the edit screen (with undo); swipe-to-delete isn't built.
- The units setting (metric/imperial) exists in the database but has no control in Settings yet.
- The mobile app is verified by typecheck, unit tests and bundling, not yet on a device or with Maestro.
