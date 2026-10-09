# Stage 4: Reminders

**Goal:** a reminder when the next feed is due.

The stage ships in three phases so each one is usable on its own.

## Phase A: due time in the app (no new infrastructure) · done

- `nextFeedDue(events, settings)` in `domain`: `due = started_at of the latest breast or bottle feed + interval`. `null` while a breastfeed is running, when there's no feed yet, or when reminders are off.
- `feedDueText(due, now, timeZone)`: "Next feed due in 42m · around 3:02 pm", "Feed due now" (within a minute), "Overdue 10m · was due 3:02 pm", each with "· Left side next" once a breastfeed has been logged (from `nextBreastSide`). The time is in the baby's time zone.
- Settings → Tracking, per baby (`baby_settings.feed_reminder_enabled`, `feed_reminder_interval_min`): one "Feed reminders" chip row, Off · 2h · 2h 30m · 3h · 3h 30m · 4h.
- "At night: Remind / Quiet" under Feed reminders (`baby_settings.feed_reminder_at_night`, default Remind). Quiet hides the due line during the baby's night window; in Phase B it also stops night notifications.
- Home shows the due line between the running cards and the day summary on both apps, updating every 30s. Overdue uses the caution tone.
- Tests: `feed-due.test.ts` (latest breast vs bottle, deleted feeds, running breastfeed, interval changes, text and choices), component tests for the Settings chips (web) and the Home line (both apps), and `e2e/reminders.spec.ts`.

## Phase B: Web Push (needs keys set up once)

- Tables:
  - `push_subscriptions(id, user_id, platform 'web'|'expo', endpoint, p256dh, auth, expo_token, created_at, last_seen_at)`, RLS: own rows only.
  - `reminder_prefs(user_id, baby_id, feed_reminders bool)`: per-person opt-in ("Notify me").
  - `reminder_snoozes(user_id, baby_id, until)`: one row per person and baby. Cleared by a trigger when a new feed starts.
  - `reminder_deliveries(user_id, baby_id, due_at, sent_at)`: one row per person per due time, so a reminder is sent once.
- `claim_due_reminders(secret text)`: a `security definer` function that checks the secret against Supabase Vault, finds every opted-in person whose baby's feed is due (and not snoozed, and not already delivered for that due time), records the deliveries and returns the push payloads. The web container never needs the service role key.
- Sender: a TanStack Start route `POST /api/reminders/send`, protected by the same secret in a header, calls `claim_due_reminders`, sends with `web-push` and the VAPID keys, and deletes subscriptions that return 404/410.
- Trigger: `pg_cron` every minute calls the route with `pg_net`. Self-hosters without `pg_cron` can call the route from any scheduler; the compose file gets an optional one-line cron container.
- Service worker (`/sw.js`): shows the notification ("Feed due · Last feed ended on Right. Next side: Left") with actions **Start feed · Left** and **Snooze 30m**, and opens the app on tap. Snooze calls an RPC with the user's session.
- Settings → Notifications on this device: "Notify me" switch per baby, permission prompt, and a "Send a test notification" button. On iPhone it explains that babble must be added to the home screen first (iOS 16.4+).
- In-app snooze on the Home due line: 15m / 30m / 1h. A snooze moves only that person's next notification; the due time on Home doesn't change.
- Secrets to set once: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `REMINDER_SECRET` as Fly secrets, and `REMINDER_SECRET` plus the app URL in Supabase Vault.

## Phase C: Expo

- Expo push tokens stored in `push_subscriptions` (`platform = 'expo'`); the sender also posts to the Expo push service.
- Local notifications scheduled on the device as a backup when offline, rescheduled whenever the due time changes.
- Needs an Android dev build with Firebase Cloud Messaging credentials set up in EAS.

## Later

- Per-person quiet hours (the night switch is per baby)
