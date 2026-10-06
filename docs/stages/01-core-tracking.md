# Stage 1: Core Tracking (Huckleberry parity)

**Goal:** we can stop using Huckleberry for day-to-day logging, on Expo and on the web app at phone size.

## Scope

- Schema: `events` + all detail tables + `timed_segments` (see [data-model.md](../data-model.md))
- RPCs for atomic multi-row actions: `start_session`, `switch_side`, `pause_session`, `resume_session`, `end_session`, `create_event_with_details`, `update_event_with_details`
- Trackers:
  - Sleep: timer + manual entry
  - Breast feed: segment timer with L/R switching and pause (basic L/R totals; the full downtime display comes in Stage 2)
  - Pump: segment timer with L/R switching and pause, plus amounts on finish
  - Bottle, nappy (two colours, five sizes, wet size, texture, rash), growth, custom
- Home dashboard, category lists, detail/edit, soft delete with undo
- Realtime: Supabase Realtime → TanStack Query invalidation, so a running timer started by one parent appears for the other
- Web at phone size passes the same logging flows as mobile (Playwright on a phone viewport)

## Done when

- Every tracker can be added, edited and deleted on both apps.
- A timer started on one device is visible and controllable on another within a couple of seconds.
- The family is logging in Babble instead of Huckleberry.

## Tests

- `domain`: basic segment totals, event validation (e.g. end after start, at most two colours)
- RPC tests: the single-running-session constraint, atomic side switching
- Playwright: start feed → switch → pause → done, on a phone viewport
