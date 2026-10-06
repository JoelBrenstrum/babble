# Stage 4: Reminders

**Goal:** a reminder when the next feed is due.

## Scope
- `nextFeedDue(lastFeed, intervalMin)` in `domain`: `due = lastFeed.started_at + interval`, where the last feed is the latest **breast or bottle** feed
- The schedule is recalculated whenever a feed is created, edited or deleted
- `nextSide(lastBreastFeed)` in `domain`: the opposite of the last segment's side, shown in the reminder ("ended on Right. Next side: Left") with a "Start feed · Left" action
- Per-person opt-in (`reminder_prefs`)
- **Snooze** from the notification and in-app (15m / 30m / 1h). A snooze moves only that person's next notification; the due time shown on Home doesn't change. It's cleared automatically when a new feed starts.
- Home shows "Next feed due in 42m" / "Overdue 10m"
- Delivery:
  - **Server-side push is the source of truth**, so it works for the web PWA (and therefore for self-hosters): a `scheduled_notifications` table, with a sender triggered by `pg_cron` + `pg_net` calling a TanStack Start route (or a worker container in the compose stack)
  - Web: Web Push with VAPID keys (iOS needs the PWA installed to the home screen, iOS 16.4+)
  - Expo: Expo push, plus local notifications as a backup when offline

## Later
- Quiet hours
