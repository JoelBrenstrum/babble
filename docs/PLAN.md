# babble — Plan

babble is a baby tracker modelled on Huckleberry, with detailed breastfeeding and pumping sessions. It has a TanStack Start web app (which also works as a phone PWA) and an Expo mobile app. It's built for our family first, self-hostable, and ready to be released as a product.

## Documents

| File                               | Contents                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------- |
| [prompt.md](prompt.md)             | Original prompt (verbatim), rewritten prompt, follow-up decisions          |
| [architecture.md](architecture.md) | Key decisions, repo layout, self-hosted vs. hosted deployment              |
| [data-model.md](data-model.md)     | Schema: base `events` table, detail tables, timed segments, downtime rules |
| [ui.md](ui.md)                     | Screen-by-screen functional spec for both apps, linked to the designs      |
| [design/](design/README.md)        | Claude Design export: design system, tokens, core screens                  |
| [stages/](stages/)                 | One plan per stage                                                         |

## Stages

| Stage | Plan                                                  | Summary                                                                                           |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 0     | [Foundations](stages/00-foundations.md)               | Monorepo, both app shells, Supabase + RLS, auth, families, self-host compose                      |
| 1     | [Core tracking](stages/01-core-tracking.md)           | All trackers, home, category lists, realtime. Huckleberry parity on mobile and the phone web app. |
| 2     | [Feed and pump sessions](stages/02-feed-sessions.md)  | Downtime breakdown, merge threshold, resume latest feed, feed ↔ nap prompts                       |
| 3     | [Timeline](stages/03-timeline.md)                     | Timeline day and 7-day views, day start, night window. Built.                                     |
| 4     | [Reminders](stages/04-reminders.md)                   | Feed-due reminders through Web Push and Expo push                                                 |
| 5     | [Huckleberry import](stages/05-huckleberry-import.md) | CSV import, including solids. Built.                                                              |
| 6     | [Food intake](stages/06-food-intake.md)               | Parked. (The baby's own solids are a normal tracker, built separately.)                           |
| 7     | [Stats](stages/07-stats.md)                           | Today / 7d / 30d / All averages and charts, WHO growth percentiles with point readouts. Built.    |

### Built beyond the stages

Details for each are in [ui.md](ui.md) unless noted.

- **Solids** tracker: foods, amount, reaction, first tries; imported from Huckleberry too.
- **Chair mode** (`/chair`, web): a full-screen feed station for a tablet or a Raspberry Pi touchscreen ([raspberry-pi.md](raspberry-pi.md)), with big Left/Right buttons, quick bottle and nappy, discard, idle time, dimming, full screen and a self-refresh on new releases. Also shown on the welcome page.
- **Nappy prompt** when a feed starts, after the first side or when it ends (a per-baby setting), plus the feed ↔ nap prompts.
- **Keep screen on** switch on feed sessions (Wake Lock / expo-keep-awake).
- **Per-person avatar colours** (`person-1`…`person-4` tokens, apart from the tracker colours).
- **Caregivers**: owners rename and remove members; everyone renames themselves.
- **New release banner** on web and in chair mode (`/api/version`, no service worker).
- **Timeline 24h** view: the rolling last 24 hours with totals for that window.
- **Predictions** (Plus): `predictDay` in `domain/predict` replays the feed → sleep → feed cycle from the last 7 days (medians weighted by recency and time of day) to show the likely next sleeps and feeds. Home shows "Likely asleep / awake around …"; today's Timeline shows dashed blocks for the next 4 hours, fading further out. Backtested on 15 days of a 2-week-old: next sleep start typically within 11–15 min, wake-up within ~24 min; beyond ~3h it's no better than a guess, hence the short horizon. First feature gated by `entitlements` (`predictions`, Plus only when `BILLING_ENABLED=true`); the seeded Smiths family is on Plus.

Each stage ends with something usable on both apps. A stage's plan is fleshed out in detail (edge cases, test tables, screen states) when the stage begins.

## Decision log

| Topic              | Outcome                                                                                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web + mobile       | TanStack Start web + Expo mobile. No Expo web.                                                                                                                                                                                                      |
| Backend            | Supabase, using only features available when self-hosted                                                                                                                                                                                            |
| Deployment         | Self-hosted and hosted from one codebase. No store app for self-hosted; the web app must work well on a phone (PWA).                                                                                                                                |
| License            | AGPL-3.0                                                                                                                                                                                                                                            |
| Downtime           | Derived from segments, never stored. Merge threshold is configurable, default 15s (5s was too tight for re-latching). Gaps at or above the threshold start a new row, even on the same side; a finished side shorter than the threshold is ignored. |
| Pumping            | L/R timed segments with downtime, the same as breastfeeding                                                                                                                                                                                         |
| Resume             | Latest feed only                                                                                                                                                                                                                                    |
| Feed reminder      | Measured from the start of the last feed, breast **or** bottle                                                                                                                                                                                      |
| Feed → nap prompt  | Offers "start at feed end" as well as "now"                                                                                                                                                                                                         |
| Huckleberry import | CSV only. The unofficial API was dropped. Tummy time and Bath import as custom events.                                                                                                                                                              |
| Sign-in            | Email magic link + Google to start. Apple sign-in is added when the iOS app ships.                                                                                                                                                                  |
| Hosting (family)   | The same web Docker image, pointed at **Supabase Cloud**. Initially on Fly.io at a `*.fly.dev` domain; Unraid remains an option.                                                                                                                    |
| Reminders          | Snooze included in Stage 4. Quiet hours later.                                                                                                                                                                                                      |
| Mobile             | Bundle ID `com.brenstrum.babble`. No Apple Developer account for now: Android dev builds, and the PWA on iPhone.                                                                                                                                    |
| Food intake        | Separate from baby events. The whole feature is parked until late.                                                                                                                                                                                  |
| Babies             | Any number of babies per family (and across families); switch with a dropdown in the sidebar/header (web) or the Home header (mobile). The choice is remembered per device.                                                                         |
| Discarding timers  | A running feed, pump or nap can be discarded from its card. Under a minute it's immediate; after a minute it asks to confirm. Undo is always offered.                                                                                               |
| Entry authors      | List rows show who logged each entry; the entry screen shows "Logged by Jane · 6 Oct, 3:12 am · edited".                                                                                                                                            |
| Naming             | "History" is called **Timeline** everywhere.                                                                                                                                                                                                        |
| Design changes     | UI changes made in code are logged as paste-ready Claude Design prompts in [design/pending-design-changes.md](design/pending-design-changes.md); the Claude Design project stays the visual source of truth.                                        |
| Quick-add nappy    | Build it small (long-press for one-tap with undo). Backlog.                                                                                                                                                                                         |
| Chair mode on a Pi | Chromium with `--ozone-platform=wayland --disable-gpu` (the Pi 3's GPU gives a white screen otherwise), opened as an app window that goes full screen on the first tap. Kiosk mode was tried and dropped in favour of full screen.                  |
| Release detection  | A build-time release id compared with `/api/version`; pages are server-rendered and assets hashed, so a reload is enough and no service worker is needed.                                                                                           |

## Open questions

- **Desktop running timer:** sidebar card or top bar? (The design shows both.)
- **"Change server" on the sign-in screen:** the design includes it. Under our decisions (no store app for self-hosted; the PWA is served by its own server), it isn't needed. Drop it, or keep it for a future store app that can connect to other servers?

## Backlog

- Quick-add nappy
- Demo baby: a Settings button that adds a "Demo baby" with a realistic, seeded last 7 days (feeds with sides, naps with a wake-up, nappies, a pump, growth) through `import_events` with a `demo` source, and a matching "Remove demo data". Useful for showing babble, screenshots and testing stats.
- iOS Live Activity / Android ongoing notification for running sessions (Expo only)
- Home-screen widgets
- Real offline sync (PowerSync)
- Data export: JSON done (Settings → Data). CSV still to come.
- Billing (hosted product only). Entitlements are wired for `predictions` (hidden on free) and `multiple_babies` ("Add a baby" shows a lock and a Plus badge and opens the Plus popup; `/onboarding/baby?mode=add` redirects home), and `extra_carers` (a free family has at most two carers, counting pending invites; "Invite a caregiver" locks the same way). Stats stay free; more advanced stats may become Plus later. The database enforces the baby and carer limits too when `private.instance_settings.billing_enabled` is on (it must match `BILLING_ENABLED`). No upgrade flow yet.
- Marketing site (can live in the TanStack Start app)

### Expo app, to pick up later

The web app (and PWA) leads for now. When work moves back to the native app:

- Do a device build: nothing since the last build has been checked on a phone, and the app is only verified by typecheck, unit tests and bundling. Add Maestro tests.
- Feed reminders, Stage 4 Phase C: Expo push tokens, the sender posting to the Expo push service, local notifications as an offline backup, and Firebase Cloud Messaging credentials in EAS for Android.
- Account parity with web: change password, the choose-a-new-password screen for recovery links, and the "Continue as…?" check when a sign-in link is for a different account than the one signed in (today the app switches silently).
- "Copy code" on the invite panel (needs the `expo-clipboard` native module).
- Swipe to delete on list rows, with undo.
- Apple sign-in and an iOS build once there's an Apple Developer account.
