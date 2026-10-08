# Claude Design prompt: babble remaining screens + desktop web

Continue the **babble design system v1 ("Sage")** in this project. Use its existing tokens, components and patterns exactly: the same colours, Figtree type scale, radii, spacing, Lucide icons at stroke 2.75, side toggle, running-timer card, chips, segmented control, stepper, swatch picker, size selector, bottom sheet, undo toast, swipe-to-delete, day group header, tab bar and empty state. **Don't change any tokens.** If a screen needs a new component, build it from the existing tokens and add it to the component sheet.

## Correction to the platform note

babble is now **two apps that share tokens**:

- **Mobile:** Expo (React Native) with NativeWind, for iOS and Android.
- **Web:** TanStack Start (React) with Tailwind and shadcn/ui (Radix), restyled to the babble tokens. The web app must also work as an **installable phone PWA**, because self-hosted users only have the web app. At phone width it uses the same layouts as the native app. At desktop width it gets its own richer layouts.

Please update the "One Expo codebase" line in the design system intro.

## Phone screens to design (light and dark, phone width)

Use the same baby (Olivia, 10 days old) and caregivers (John "Jo", Jane "Ja") as the existing screens.

1. **Bottle form:** content as a segmented control (Breast milk / Formula / Mixed / Other), amount stepper (±10 ml, tap the number for a keypad), an optional "left over" amount, time (defaults to now, editable), notes, and a Save button.
2. **Sleep timer:** a large running timer with tabular figures, Start/Stop, a "Started earlier?" control to adjust the start time, location chips (multi-select: cot, bassinet, pram, car, swing, held, nursing, co-sleep, next to carer), and an optional "how it went" section (fell asleep: under 10 min / 10–20 min / took a while; mood at start and end: happy / upset; woken by carer). Also show a **manual entry** variant with start and end pickers.
3. **Pump timer:** the same layout and behaviour as the breastfeed timer (L/R side toggle, Pause, session list with "idle" downtime rows), using the pump colour. On Finish, a bottom sheet asks for amounts: left ml and right ml steppers with a computed total.
4. **Growth form:** weight, length and head circumference (each optional, units follow settings), date, notes.
5. **Custom event form:** title (with suggestion chips from past titles, e.g. "Bath", "Tummy time"), description, start time, optional duration or end time, and an optional timer.
6. **Feed session detail / edit:** the session list (Left / idle downtime / Right rows), with every row editable for side, duration and downtime. Include add segment, delete segment, edit start time, and a **Resume feed** button. Resume appears only on the most recent feed. Add a small "Imported from Huckleberry, no downtime data" variant where downtime and side order are hidden.
7. **Feed ↔ nap prompts** (bottom sheets):
   - Starting a feed while a nap is running: "End nap?" with "End now", "End at feed start" and "Keep sleeping".
   - Finishing a feed: "Start a nap?" with "Start now", "Started at feed end (3:34 am)" and "Not now".
8. **Feed reminder notification + snooze:** the "Feed due" notification (lock screen style) with Snooze 15m / 30m / 1h, the in-app overdue banner on Home, and the snoozed state ("Snoozed until 4:24 am").
9. **Other category lists:** Sleep, Nappy, Pump, Growth and Custom, in the same pattern as the Feeds list (day groups with totals, rows with tinted part pills, + in the header, swipe to delete). Include the empty state for one of them.
10. **Onboarding / auth:** sign in (email magic link + "Continue with Google"), the "check your email" state, create or join a family (invite code), add baby (name, birth date, timezone detected), choose day start (midnight or a custom time), and the invite-a-caregiver share screen.
11. **Settings:** baby profile · caregivers & invites · day start time · night window (e.g. 19:00–07:00) · units (metric/imperial) · feed reminders (interval for the baby, on/off for me) · downtime merge threshold (default 15s) · auto-end paused sessions after (default 30m) · theme (system / light / dark / dark at night) · import from Huckleberry · export data · account (sign out, delete account).
12. **Add-to-Home-Screen prompt** for the web PWA on a phone (iOS Safari share-sheet instructions and the Android install prompt).

## Desktop web layouts (light and dark, around 1440 wide; also show a tablet width around 900)

1. **App shell:** a left sidebar with the wordmark, baby switcher, and nav (Home, Feeds, Sleep, Nappies, Pump, Growth, Custom, History, Stats, Settings), plus caregiver avatars and running-session indicators in the sidebar. It collapses to the phone bottom tab bar on narrow widths.
2. **Home:** tracker rows and running-session cards on the left, with **today's timeline** (the daily history view) alongside on the right. The "Next feed due" banner sits across the top.
3. **Category list + detail split view** (use Feeds): the day-grouped list on the left and the selected feed's session detail/edit panel on the right. Show the add flow opening in the detail panel or a dialog rather than a full-screen page.
4. **History:** day view with the timeline and totals side by side, and a week view with seven full-height day columns plus a daily totals table below.
5. **Huckleberry import** (web only, multi-step): upload CSV → choose target baby and confirm timezone → preview (counts per type, date range, a table of skipped rows with reasons, warnings) → importing progress → summary. Re-importing the same file adds only new rows, so say that on the preview.
6. **Settings:** a two-column layout with a section list on the left and forms on the right.
7. **Running timer on desktop:** how an active breastfeed looks on the web, as a persistent card in the sidebar or a top bar that's controllable from any page.

## States to include where relevant

Loading skeletons, empty states, offline ("saved on this device, will sync"), a partner's live update arriving (a running card appearing with "Started by Jane"), errors (failed save with retry), and destructive confirmations.

## Deliverables

- All screens above in light and dark.
- Any new components added to the component sheet.
- A short note on how the desktop layouts scale down to tablet and phone.
