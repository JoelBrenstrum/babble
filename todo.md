# Todo

Ideas to add to Babble. Each item gets picked up and folded into the relevant stage plan in [docs/stages/](docs/stages/).
- [ ] **Stats: hover or tap a bar to see that day's breakdown.** Each bar in the Stats charts shows a breakdown for that single day: on hover on desktop (a popover next to the bar), and on tap on touch devices (a bottom sheet). On desktop, clicking the bar keeps the popover open so its link can be followed. For example, on the feeds chart: each feed's start time, duration, left / right / downtime split, and bottle amounts, plus the day's totals. Use the baby's day start for day boundaries, add a link to that day in History, and show the selected bar as highlighted. Web and Expo.

- [ ] **Wording fix-ups.** Copy that reads wrong in the app. Collect them here and fix in one pass.
  - Stats Patterns caption says "The range below doesn't change these." but the range picker is above the Patterns section on web and mobile (`PATTERNS_CAPTION` in `packages/domain/src/stats/insights.ts`). Should say "above", or drop the sentence.
- [ ] **"Is baby asleep?" starts the timer.** A quick way to say the baby is already asleep so the nap timer is running when they wake, rather than logging the nap after the fact.
- [ ] **Bug: desktop web ends feeds mid-feed.** With the web app open in a browser on the Mac, a running feed gets stopped partway through. Suspects: the auto-end after a paused session (`auto_end_paused_session_min`), a stale tab replaying an end, or the feed ↔ nap prompt firing on focus. Reproduce with a feed running on the phone and the Mac tab open, and check `created_device` on the ended event.

## Future
