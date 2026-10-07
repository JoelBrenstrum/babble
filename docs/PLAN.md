# Babble — Plan

Babble is a baby tracker modelled on Huckleberry, with detailed breastfeeding and pumping sessions. It has a TanStack Start web app (which also works as a phone PWA) and an Expo mobile app. It's built for our family first, self-hostable, and ready to be released as a product.

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
| 3     | [Timeline](stages/03-timeline.md)                     | Timeline day and week views, day start, night window                                              |
| 4     | [Reminders](stages/04-reminders.md)                   | Feed-due reminders through Web Push and Expo push                                                 |
| 5     | [Huckleberry import](stages/05-huckleberry-import.md) | CSV import. Parser done and tested; screen and RPC to do. Can run in parallel with Stage 2.       |
| 6     | [Food intake](stages/06-food-intake.md)               | Parked                                                                                            |
| 7     | [Stats](stages/07-stats.md)                           | Phase 2 insights                                                                                  |

Each stage ends with something usable on both apps. A stage's plan is fleshed out in detail (edge cases, test tables, screen states) when the stage begins.

## Decision log

| Topic              | Outcome                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web + mobile       | TanStack Start web + Expo mobile. No Expo web.                                                                                                                                                               |
| Backend            | Supabase, using only features available when self-hosted                                                                                                                                                     |
| Deployment         | Self-hosted and hosted from one codebase. No store app for self-hosted; the web app must work well on a phone (PWA).                                                                                         |
| License            | AGPL-3.0                                                                                                                                                                                                     |
| Downtime           | Derived from segments, never stored. Merge threshold is configurable, default 15s (5s was too tight for re-latching). Same-side gaps above the threshold show as separate rows.                              |
| Pumping            | L/R timed segments with downtime, the same as breastfeeding                                                                                                                                                  |
| Resume             | Latest feed only                                                                                                                                                                                             |
| Feed reminder      | Measured from the start of the last feed, breast **or** bottle                                                                                                                                               |
| Feed → nap prompt  | Offers "start at feed end" as well as "now"                                                                                                                                                                  |
| Huckleberry import | CSV only. The unofficial API was dropped. Tummy time and Bath import as custom events.                                                                                                                       |
| Sign-in            | Email magic link + Google to start. Apple sign-in is added when the iOS app ships.                                                                                                                           |
| Hosting (family)   | The same web Docker image, pointed at **Supabase Cloud**. Initially on Fly.io at a `*.fly.dev` domain; Unraid remains an option.                                                                             |
| Reminders          | Snooze included in Stage 4. Quiet hours later.                                                                                                                                                               |
| Mobile             | Bundle ID `com.brenstrum.babble`. No Apple Developer account for now: Android dev builds, and the PWA on iPhone.                                                                                             |
| Food intake        | Separate from baby events. The whole feature is parked until late.                                                                                                                                           |
| Babies             | Any number of babies per family (and across families); switch with a dropdown in the sidebar/header (web) or the Home header (mobile). The choice is remembered per device.                                  |
| Discarding timers  | A running feed, pump or nap can be discarded from its card. Under a minute it's immediate; after a minute it asks to confirm. Undo is always offered.                                                        |
| Entry authors      | List rows show who logged each entry; the entry screen shows "Logged by Jane · 6 Oct, 3:12 am · edited".                                                                                                     |
| Naming             | "History" is called **Timeline** everywhere.                                                                                                                                                                 |
| Design changes     | UI changes made in code are logged as paste-ready Claude Design prompts in [design/pending-design-changes.md](design/pending-design-changes.md); the Claude Design project stays the visual source of truth. |
| Quick-add nappy    | Build it small (long-press for one-tap with undo). Backlog.                                                                                                                                                  |

## Open questions

- **Desktop running timer:** sidebar card or top bar? (The design shows both.)
- **"Change server" on the sign-in screen:** the design includes it. Under our decisions (no store app for self-hosted; the PWA is served by its own server), it isn't needed. Drop it, or keep it for a future store app that can connect to other servers?

## Backlog

- Quick-add nappy
- iOS Live Activity / Android ongoing notification for running sessions (Expo only)
- Home-screen widgets
- Real offline sync (PowerSync)
- Data export (CSV/JSON). Needed before any public release.
- Billing + entitlements (hosted product only)
- Marketing site (can live in the TanStack Start app)
