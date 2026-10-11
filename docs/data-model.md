# Data Model

Every baby event is a row in a base `events` table, plus an optional 1:1 detail table for its type. Breastfeeding and pumping also have 1:N timed segments.

## Account tables

```
families        id, name, created_at
family_members  family_id, user_id, role (owner|caregiver|viewer), display_name  (owners rename or remove members; members rename themselves; only display_name is updatable)
babies          id, family_id, name, birth_date, sex?, timezone,
                day_start_minutes (0 = midnight), created_at
baby_settings   baby_id, feed_reminder_interval_min?, feed_reminder_enabled,
                downtime_merge_threshold_sec (default 15),
                auto_end_paused_session_min (default 30), units (metric|imperial)
push_subscriptions  id, user_id, platform (web|expo), token/endpoint, created_at
reminder_prefs      user_id, baby_id, feed_reminders bool   -- per-person opt-in
```

## `events` (base table)

```
events
  id               uuid (client-generated)
  baby_id          fk
  type             enum: sleep | breast_feed | bottle | solids | nappy | pump | growth | custom
  started_at       timestamptz
  ended_at         timestamptz null      -- null = running; equals started_at for instant events
  notes            text null
  created_by       user_id
  source           enum: manual | huckleberry_csv
  source_ref       text null             -- stable hash of the CSV row + occurrence index, for idempotent re-import
  created_at, updated_at, deleted_at
```

- Indexes: `(baby_id, started_at desc)` and `(baby_id, type, started_at desc)`. Unique `(baby_id, source, source_ref)` where `source_ref` is not null.
- Constraint: a partial unique index allows only one running event per `(baby_id, type)`, `where ended_at is null and deleted_at is null`.

## Detail tables (1:1 with `events`, keyed by `event_id`)

```
sleep_details        event_id,
                     locations enum[] (cot|bassinet|pram|car|swing|held|nursing|bottle|co_sleep|next_to_carer|other),
                     fall_asleep? (under_10_min|10_to_20_min|long_time),
                     start_moods enum[] (happy|upset), end_moods enum[] (happy|upset),
                     woken_by_carer bool

session_details      event_id, state (running|paused|ended)      -- breast_feed and pump
timed_segments       id, event_id, side (left|right), started_at, ended_at null
                     -- 1:N, used by breast_feed and pump. Downtime is derived, never stored.

bottle_details       event_id, content (breast_milk|formula|mixed|other), amount_ml,
                     amount_left_ml?

solids_details       event_id, foods text[] (1–20 names, each 1–40 chars),
                     amount enum? (taste|some|lots),
                     reaction enum? (loved|liked|unsure|disliked)

nappy_details        event_id, wet bool, dirty bool,
                     wet_size enum? (tiny|little|medium|large|massive),
                     poo_size enum? (tiny|little|medium|large|massive),
                     poo_colours enum[] (max 2),
                     poo_textures enum[] (runny|loose|seedy|pasty|formed|mucousy|solid|pebbles|diarrhea),
                     rash bool default false

pump_details         event_id, left_ml?, right_ml?, total_ml?    -- total for "total only" entries

growth_details       event_id, weight_g?, length_mm?, head_circumference_mm?

custom_details       event_id, title, description
```

Poo colour presets (from `design/tokens`): yellow, mustard, green, dark_green, brown, orange, black, red, white_grey. Red, black (after the meconium days) and grey/white show a gentle "check with your provider" note.

The texture, sleep location and mood enums cover all of Huckleberry's values, so CSV imports lose nothing (see [Stage 5](stages/05-huckleberry-import.md)). The TypeScript shapes of these tables live in `packages/domain/src/events/types.ts`.

## Timed segments and downtime

Breastfeeding and pumping share one model and one pure function:

```ts
summariseSegments(segments, { mergeGapSec }) => {
  rows: Array<{ kind: 'side', side, durationSec } | { kind: 'downtime', durationSec }>,
  totalActiveSec, totalDowntimeSec, leftSec, rightSec, spanSec, lastSide
}
```

Rules:

1. Sort segments by `started_at`.
2. Gap below `mergeGapSec` → no downtime row. If both segments are on the same side, they combine into one row.
3. Gap at or above the threshold → a downtime row, including between two segments on the same side (`Left 5m · Downtime 1m · Left 5m`).

Downtime is derived rather than stored so that changing the threshold applies to past sessions too, and edits can't leave inconsistent data behind.

## Session RPCs

- `start_session(baby_id, type, side, start_at?)`: idempotent per running type; `start_at` lets a nap start "at feed end".
- `switch_side`, `pause_session`, `resume_session(event_id, side?)`.
- `end_session(event_id, end_at?)`: closes the open segment; feeds and pumps end at their last segment, naps at `end_at` (default now).
- `resume_feed(event_id, side?)`: reopens the most recent feed (breast or bottle) if it's a breastfeed and no feed is running; adds a new segment so the gap shows as downtime.
- `set_session_start(event_id, start_at)`: moves a running session's start (and the first segment's, for feeds and pumps). The start can't be in the future or after the first segment ended.

## Feeds for reminders

The "last feed" for reminders is the most recent `breast_feed` **or** `bottle` event, measured by `started_at`.

## Food intake (parked, see [Stage 6](stages/06-food-intake.md))

Draft only. It belongs to the parent rather than the baby, so it isn't an `events` row:

```
intake_entries   id, family_id, user_id, consumed_at, tags text[], caffeine_mg?, notes
```
