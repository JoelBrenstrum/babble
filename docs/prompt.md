# Babble — Prompt

## Original Prompt

> We want to essential clone huckleberry but with more features
>
> I want a web app and an expo app,
>
> Features to bring across
> Sleep
> Feed/bottle
> Nappy
> Pumping
> Growth
> Don't need activities
> Don't need milestones
> Don't need medicine
> Maybe the ability to add an adhoc event with length and description
>
> Additional features
> Track feeding downtime/lost tjme, track each boob time as a micro session. So you can see all feeds in a session.
>
> When changing sides we show the downtime in the session info. If the downtime is small enough (5 seconds we just remove the downtime, of its the same side then we just continue on the same left/right session)
>
> Left 10m 32s,
> Downtime 3m 2s
> Right 12m 23s
> Downtime 4m 3s
>
> Allow resuming a saved feeding without having to make a new one. With feeds have a reminder option where you can say how often between feeds and this is tracked from the start of a the previous feed.
>
> Ability to capture food consumed before feed. Caffeine, eggs etc so we can potentially track a rough period based on consumed food.
>
> When starting a feed prompt to stop current nap of there is a nap, at the end of a feed prompt to start a nap
>
> For nappys allow picking colour from presets, but allow selecting between 2, way black black/green green/yellow
> More sizes for poo. tiny, little, medium, large, massive
>
> Quick add nappy button. Maybe unsure about implementing
>
> A view where I can see all feeds and a similar view for all nappys etc can add from this view. Also on the main list clicking takes you to list automatically but we have an add button to the right
>
> A daily and weekly history view where you can see how the baby is tracking with events.
> The ability to start the baby's day at midnight or a chose time.
>
> I also want a nice stats page where you can view insights into the collected information. Phase 2
>
> Also the ability to import hucklenerry csv exports, they don't track feeding downtime so we will import as best effort.
>
> Draw me up a detailed plan, question any ideas.
> I think we could use a base event table with smaller tables for more specific data per event,
>
> Let's try and break up the work into logical stages with some of the additional features coming as separate plans
>
> We need a ui plan as well for each screen.

## Rewritten Prompt

Build **Babble**, a baby tracking app modelled on Huckleberry, with extra features focused on breastfeeding detail. It ships as a **web app** and an **Expo (iOS/Android) app**.

### Trackers carried over from Huckleberry

- Sleep
- Feeding: breast and bottle
- Nappy
- Pumping
- Growth
- **New:** Custom (ad-hoc) event with a title, description, start time and optional duration

Out of scope: activities, milestones and medicine.

### New features

1. **Breastfeeding micro-sessions.** A feed session is made of per-side segments. The session view lists each segment and the downtime between segments:
   ```
   Left      10m 32s
   Downtime   3m 02s
   Right     12m 23s
   Downtime   4m 03s
   ```
   A gap under a threshold (default 5s) doesn't count as downtime. Resuming on the same side continues that side.
2. **Resume a saved feed.** A finished feed can be reopened and continued instead of starting a new one.
3. **Feed reminders.** Set a target interval between feeds, measured from the _start_ of the previous feed, and get a reminder when it's due.
4. **Food intake log.** Record what the feeding parent ate or drank (caffeine, eggs, dairy and so on) so it can later be compared with how the baby behaves after feeds.
5. **Feed ↔ nap prompts.** Starting a feed while a nap is running asks whether to end the nap. Ending a feed asks whether to start a nap.
6. **Richer nappies.** Poo colour is chosen from presets, with up to two colours per nappy (e.g. black/green, green/yellow). Five poo sizes: tiny, little, medium, large, massive.
7. **Quick-add nappy** _(still to decide)_.
8. **Category lists.** Each tracker has a full-history list you can add from. On the home screen, tapping a tracker row opens its list, and a separate + button on the right adds an entry.
9. **Daily and weekly history views**, with a configurable day start (midnight or a time you choose).
10. **Stats and insights page.** Phase 2.
11. **Huckleberry CSV import**, best effort. Huckleberry has no downtime data, so imported feeds have none.

### Follow-up decisions (2026-10-07)

First round:

- **No Expo web.** The web app is a separate **TanStack Start** app so it can offer a richer web experience. Mobile is Expo (iOS/Android only).
- Backend: **Supabase**.
- Same-side pause above the merge threshold shows as **separate rows** (`Left 5m · Downtime 1m · Left 5m`).
- **Bottle feeds reset the feed reminder.** Breast and bottle are both feeds.
- ~~Import uses the unofficial Huckleberry API.~~ Reversed later: CSV only (see Q12 below).
- Starts as a family app, but must be **self-hostable** and **releasable as a public product**. Both deployment modes are supported from day one.
- Most of the pushback was accepted (see the decision log in [PLAN.md](PLAN.md)).

Second round:

- **Q4:** only the most recent feed can be resumed.
- **Q6:** food intake is parked until a late phase. Its details will be sorted out then.
- **Q7:** pumping gets left/right timed segments with downtime, the same as breastfeeding.
- **Q11:** license is **AGPL-3.0**.
- **Q12:** **CSV-only** Huckleberry import. The unofficial API is dropped.
- **Q13:** no App Store app for self-hosted installs. The **web app must work well on a phone** (responsive, installable PWA) so self-hosters can use it there.
- The plan is split into multiple files under `docs/`.

Third round:

- A second Huckleberry export (one of every entry type) was provided. Both exports are anonymised into the repo as test fixtures, and the importer is unit-tested against them.
- Skip the Apple Developer account for now.
- Bundle ID: `com.brenstrum.babble`.
- Our family's instance runs on a local **Unraid** server: a Docker image of the web app pointed at an external database.

Fourth round:

- The UI is being designed in Claude Design, using `docs/design-prompt.md`.
- Reminders get snooze.
- The web app starts on a `fly.dev` domain.

Fifth round:

- Supabase Cloud.
- Sign-in: email magic link + Google to start.

Sixth round:

- The Claude Design export ("Sage" design system v1) is placed in the repo under `docs/design/`.

Seventh round:

- A second Claude Design export (screens v1.1: the remaining phone flows, desktop/tablet web, and a shadcn theme mapping) replaces `docs/design/`.
