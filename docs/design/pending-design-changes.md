# Pending design changes

UI changes made in code that the Claude Design project doesn't have yet. Paste a section into Claude Design (the Babble project), apply it, re-export, and sync the export into `docs/design/`. Delete a section once it's synced.

---

## 2026-10-07 · Stage 1 follow-ups

Paste everything below this line into Claude Design.

> Update the Babble design system v1 ("Sage") and screens v1.1 with the following changes. Keep all existing tokens; don't introduce new colours. Show each change in light and dark, at phone width and (where relevant) desktop web.
>
> **1. Rename "History" to "Timeline".** Every tab bar, sidebar item, page title and the screen names in `Screen.dc.html` (`day`, `week`) and `Web.dc.html` (`history-day`, `history-week`) should say Timeline. The icon stays the same (Lucide `history`).
>
> **2. Multiple babies and a baby switcher.** A family can have any number of babies (the sample family now has Olivia, 11 days, and her brother Jacob, 14 months).
> - Desktop sidebar: the baby card becomes a dropdown trigger (avatar, name, age, Lucide `chevrons-up-down`). Opening it shows a popover listing every baby (avatar, name, age, a check on the active one), grouped under family names when the user belongs to more than one family, and a final row "Add a baby" with a dashed-circle plus icon in primary.
> - Tablet rail: just the avatar; the popover opens to the right of the rail.
> - Phone (web and native): the baby name/age block in the Home header is the trigger (with the chevrons icon). On native it opens a bottom sheet titled "Switch baby" with the same rows and "Add a baby" at the bottom.
> - Each baby gets a distinct avatar colour, cycling primary → secondary → sleep → nappy → growth, so siblings are easy to tell apart.
> - "Add a baby" opens the existing Add baby form with the title "Add a baby to The Smiths", the subtitle "Everyone in the family will see them straight away.", an "Add baby" primary button and a "Cancel" ghost button, and no step counter.
>
> **3. Discard a running session.** Running-session cards (feed, pump, nap, on Home and on the full timer screen) get a quiet trash icon button (Lucide `trash-2`, ink-3, 40pt hit area) at the right end of the card header. Hover/pressed: danger-soft background with on-danger icon.
> - Under one minute it discards immediately and shows the undo toast "Feed discarded · Undo" (or "Nap discarded" / "Pump discarded").
> - After one minute, an inline confirmation panel appears inside the card under the header: danger-soft background, "**Discard this feed?** It's been running for 26m. You can undo straight after." with two buttons, "Keep feed" (secondary) and "Discard" (destructive). On native this is the system alert with the same wording.
>
> **4. Who logged an entry.**
> - List rows (all category lists) end with the logger's caregiver avatar (28pt, initials, the existing caregiver avatar style), after the duration.
> - The entry detail/edit screen shows a meta line under the header: avatar + "Logged by Jane · 6 Oct, 3:12 am", with " · edited" appended if it was changed later, or "Imported · 6 Oct, 3:12 am" for Huckleberry imports.
>
> **5. Starting a timer.** Add the "start" step of the add flow, which isn't designed yet:
> - Breastfeed and pump: two large tiles side by side (144pt tall), Left in feed-left and Right in feed-right, each with a big "L"/"R" and "▶ Start left/right", plus a secondary button "Log a past feed instead".
> - Sleep: one large sleep-coloured button "Start sleep now" with the moon icon, plus "Log a past sleep instead".
> - While starting, the tiles are replaced by a raised card with a spinner and "Starting…", then the timer screen opens.
> - If one is already running: a card "A feed is already running." with an "Open timer" primary button.
>
> **6. Category list empty state.** Replace the plain icon with the tracker's own icon tile at 64pt (round, the tracker's soft tint), the title "No breastfeeds yet", the body "Entries you log will show up here, grouped by day.", and a primary button "+ Log breastfeed" that opens the add flow.
>
> **7. Small interaction details.**
> - Home tracker rows highlight the whole row on hover, including behind the + button; the + button itself gets a stronger border on hover.
> - Every clickable control uses the pointer cursor on web.
> - Growth fields accept numbers only (decimal keypad on phones).

---

## 2026-10-07 · Stage 2: feed sessions

Paste everything below this line into Claude Design.

> Update Babble screens v1.1 for Stage 2. Most of this follows the existing `Phone Flows.dc.html` designs (`feed-detail`, `prompt-endnap`, `prompt-startnap`); these are the differences and additions.
>
> **1. Session breakdown card** (timer screen and entry screen for breastfeeds and pumps): rows of Left / Right with their coloured dots, Downtime rows with the dashed neutral dot and an "idle" tag, a "running" tag on the live side, durations right-aligned in tabular figures, and a footer "Total feeding **22m 55s**" with "lost 3m 02s" on the right. Pumps say "Total pumping". While paused, the last row is a live Downtime row that keeps counting. Imported feeds show only side rows (no downtime).
>
> **2. Segment editor** (entry screen, replacing the simple Left/Right minute steppers for saved feeds and pumps): a bordered list where each row is either an L/R pair of round toggle buttons (active one solid in its feed colour) or an "Idle" label with the dashed dot, then minutes and seconds inputs (`[ 10 ] m [ 32 ] s`), then a small trash button. Under the list: chip buttons "+ Add side" and "+ Add downtime", and the hint "Times are recalculated in order from the start time."
>
> **3. Resume feed**: on the most recent breastfeed's entry screen, a full-width primary "▶ Resume feed" button above the form, with the caption "Resume only appears on the most recent feed."
>
> **4. Nap prompts**: as designed, but the options are:
> - End-nap sheet: title "End Olivia's nap?", body "A nap has been running since 1:58 am.", options **End nap now** (primary), **End at feed start (3:12 am)** (secondary; only when the feed started more than two minutes ago, e.g. a logged bottle), **Keep sleeping** (ghost).
> - Start-nap sheet: title "Is Olivia asleep?", body "Start a nap so the timer is already running when they wake.", options **Start nap now** (primary), **Asleep since feed end (3:34 am)** (secondary), **Not now** (ghost).
> - On desktop web these are centred dialogs; on phones they're bottom sheets with a grab handle and a moon icon tile in sleep-soft.
>
> **5. Settings → Tracking** (new section between Caregivers and Appearance): a Units segmented control ("Metric (ml, kg, cm)" / "Imperial (oz, lb, in)"), a stepper "Ignore gaps shorter than [15] sec" with the hint "Short pauses, like switching sides, won't show as downtime.", and a stepper "Finish paused feeds after [30] min" with the hint "A paused feed or pump that's been left this long is finished automatically."
