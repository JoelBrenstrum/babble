# Stage 9: Offline mode

## Status (2026-10-13)

Planned. Nothing built yet. The full write-up, with diagrams, is at https://claude.ai/artifact/12pHrigi2iRG8FBst7Cp3A.

## Goal

The signal drops at 3am and someone still needs to start a feed, switch sides and log a nappy. babble keeps working with no connection and syncs once it's back, on web (PWA), Expo and chair mode.

**Works offline:** open the app with the last 8 days; start, switch, pause, resume and end feeds, pumps and naps; log every tracker; edit, delete and undo recent entries; Home, lists, the timeline and stats for the days on the device; chair mode through a Wi-Fi drop.

**Still needs a connection:** signing in and accepting invites, creating invites, roles and family changes, import and export, baby, family and account settings, history older than what's on the device, and seeing a partner's entries live.

## Where we are

- Session RPCs (`start_session`, `switch_side`, `pause_session`, `resume_session`, and `end_session` without `end_at`) stamp `now()` in Postgres. A replayed tap would record the time it reached the server, not the time it was tapped.
- `start_session` creates the event ID on the server. `save_event` already accepts an ID from the app.
- No writes are queued or retried. A failed `useMutation` shows a toast and the entry is lost.
- The `QueryClient`s exist only in memory. Route guards call `ensureQueryData`, so a cold start with no connection never gets past the spinner.
- There's no service worker, so the PWA can't open with no connection.
- `save_event` upserts without checking the version, so a stale edit overwrites newer changes.
- Already in place: client-side IDs and times (D4), soft deletes, `applySessionAction`, the clock offset, the chair offline screen, the `home-offline` design and `useOnline`.

## Approach

Every write becomes a **command**: a serializable record with its own ID, a client time, and the event ID it targets. Commands go into a durable **outbox** on the device: IndexedDB on web, MMKV on Expo. Screens show the persisted server cache with the pending commands applied on top, using a pure reducer in `@babble/domain`. A flusher sends the commands in order and removes each one when the server confirms it.

Reasons this beats persisted TanStack mutations alone: mutation functions can't be saved, the optimistic state is lost on reload or refetch, and there's no way to coalesce commands or remap IDs. PowerSync is deferred: it adds a service self-hosters would have to run (D3, D10), replaces every read, and still needs Phase 0. Revisit it if offline history beyond a week matters.

## Phases

### Phase 0: Server: commands carry their own ID and time

- `start_session` accepts an `event_id` and `at`. Switch, pause, resume and end accept `at`. Without them the server still uses `now()`, so old builds keep working.
- Validate `at`: no more than a minute ahead of server time, not before the open segment started, and not after the session ended.
- Add an `applied_commands (id, user_id, applied_at)` table. Every RPC takes a `command_id`, so a retry does nothing extra.
- `save_event` accepts an optional `base_updated_at` and returns a conflict when the entry has changed since then.
- Deleting goes through an RPC with an `at` time and a `command_id`.
- Done when: pgTAP covers retries, future and out-of-order times and the conflict check, and both apps send IDs and times.

### Phase 1: Read offline

- Persist the query cache (`@tanstack/query-persist-client`): families, babies, settings, the running and latest entries, and 8 days of events. `buster` is the schema version and `maxAge` is 7 days.
- Restore the cache before the router guards run. Use `networkMode: 'offlineFirst'`.
- Connect `onlineManager` and `focusManager`: browser online and offline events on web, NetInfo and AppState on Expo.
- Add a minimal service worker that caches the built assets and one generic app page, never API or auth responses. Version it by the release ID. Call `navigator.storage.persist()`.
- Show an offline bar with the last sync time, following the `home-offline` design. Actions that need a connection are disabled and say "Needs a connection".
- Done when: a Playwright run with `context.setOffline(true)` and a reload still shows today on Home, and an Expo cold start in airplane mode does the same.

### Phase 2: Write offline

- Domain: command types, plus a pure `applyCommands(serverEvents, commands, now)` built on `applySessionAction`.
- API: an outbox store with one adapter per platform, and a flusher that sends commands one at a time in order, with backoff, and stops on a permanent error. The hooks feed the existing query keys, so screens stay the same.
- Coalescing: a create plus its edits is sent as one create. A create plus a delete that hasn't synced cancels out. Undo removes the pending delete.
- Start with session controls, quick nappy and bottle, and the nap prompts, then forms, edits and deletes.
- Unsynced entries get a "Not synced yet" marker and the offline bar shows a count. A "Couldn't save" sheet offers Retry, Edit or Discard.
- Chair mode is the first screen to use the outbox.
- Done when: a feed with two switches and a nappy, all logged in airplane mode, sync with their tap times and appear on a partner's device within seconds.

### Phase 3: Hardening

- Web Locks so only one tab sends the outbox, with `BroadcastChannel` to update the other tabs.
- Background Sync (Chromium) and `expo-background-task`. Otherwise sync on focus or reconnect.
- Local feed reminders as an offline backup (Stage 4).
- Conflict notices, an outbox inspector in Settings → Device, and "Copy sync log".

## Issues and resolutions

| Issue                                                | Resolution                                                                                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replayed taps get the wrong time                     | Commands carry `at` from the corrected device clock, and the server validates it (Phase 0).                                                                                                                         |
| Device clock is wrong and can't be checked offline   | Persist the last clock offset and when it was measured. The server rejects times more than a minute in the future. If the offset is stale, impossible times are flagged "Check the times" rather than dropped.      |
| Commands arrive out of order                         | Send commands one at a time in order. The server rejects switches outside the open segment, and the error shows in the "Couldn't save" sheet.                                                                       |
| Two offline devices auto-end the same paused feed    | Auto-end is a command that ends at the pause time, and ending an already ended session does nothing.                                                                                                                |
| Both carers start a feed offline                     | The start that arrives second merges into the running session: the server returns the existing ID, and the outbox points that device's later commands at it. The earlier start wins, with a "Merged with …" notice. |
| Edits collide                                        | `base_updated_at` detects it. Merge the fields each person changed, keep the newest value where both changed the same field, and show a notice.                                                                     |
| Delete vs. offline edit                              | The delete wins. "Deleted by Jane" offers Undo, which restores the entry and then applies the edit.                                                                                                                 |
| A partner's reminder fires for a feed not yet synced | Accepted. Reminders are recalculated on sync, and local reminders in Phase 3 cover the offline device.                                                                                                              |
| Access token expires offline                         | The flusher waits for the session to refresh before sending. Refresh tokens last overnight.                                                                                                                         |
| Signed out or removed from the family before syncing | This is a permanent error. Keep the commands, show "N entries couldn't be saved", and offer an export as babble JSON. Signing out warns while anything is unsynced.                                                 |
| Read-only members log offline                        | Check the cached role (`useCanLog`) before queueing.                                                                                                                                                                |
| Health data saved on shared devices                  | Clear the cache and outbox on sign-out, and expire persisted data. The privacy policy notes that entries are stored on the device until they sync.                                                                  |
| Safari clears storage after 7 days without a visit   | Call `navigator.storage.persist()`, encourage installing the PWA, and send the outbox as soon as possible. Only unsynced entries are at risk.                                                                       |
| Service worker vs. SSR                               | Cache one generic page that holds no user data, never API or auth responses, and version the worker by the release ID.                                                                                              |
| Several tabs send at once                            | Command IDs make duplicate sends harmless, and Web Locks keep it to one sender.                                                                                                                                     |
| Cache size and startup time                          | Save only the Phase 1 query keys and limit events to 8 days. Older stats say "Connect to see older days".                                                                                                           |
| Commands from an old app reach a changed API         | Saved commands carry a `v` and are upgraded when the app starts. Old RPC versions keep working for at least one release, and new parameters are optional.                                                           |
| A deploy changes data shapes                         | The persister's `buster` discards cached reads but never the outbox.                                                                                                                                                |

## Decisions to make

- How many days to keep on the device. Recommended: 8, which covers today plus the 7-day averages.
- What happens when edits collide. Recommended: merge field by field and show a notice. Don't ask the person.
- Whether to add a service worker in Phase 1. Recommended: yes, kept minimal. This reverses the "no service worker" choice under Release detection in the decision log.
- Whether chair mode goes first. Recommended: yes.

## Testing

- **Domain:** `applyCommands`, coalescing, ID remapping and time validation.
- **API:** the flusher with a fake client covering timeouts, permanent errors, token refresh and stopping on a failure.
- **pgTAP:** idempotent retries, future and out-of-order times, merging two starts, and the `base_updated_at` conflict.
- **Playwright:** `context.setOffline(true)` through a full feed, a reload while offline, reconnecting, and a second browser as the partner.
- **Mobile:** Jest tests for the MMKV adapter and NetInfo wiring, and a manual airplane-mode cold start until Maestro is set up.
