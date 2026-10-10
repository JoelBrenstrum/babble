# UI Plan

Each screen is specified once here and built twice: in `apps/mobile` (Expo) and `apps/web` (TanStack Start).

This file is the **functional** spec: what each screen does and contains. The **visual** design lives in [design/](design/README.md) (Claude Design export, "Sage" direction). Where a design exists, it wins on layout and styling, and the ASCII sketches below are only a fallback.

All screens are in light and dark. The `.dc.html` files take a `screen` prop (shown in brackets).

| Screen                                                                                                                                        | Design                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview + responsive rules                                                                                                                   | `design/Babble Screens v1.1.dc.html`                                                                                                                                         |
| Home, breastfeed timer, nappy form, feeds list, timeline day/week (phone)                                                                     | `design/Screen.dc.html` (`home`, `timer`, `nappy`, `feeds`, `day`, `week`), `design/Phone.dc.html`                                                                           |
| Bottle (+ keypad), sleep timer / details / manual, pump timer + finish sheet, growth (+ error state), custom event                            | `design/Phone Forms.dc.html` (`bottle`, `bottle-keypad`, `sleep`, `sleep-details`, `sleep-manual`, `pump`, `pump-finish`, `growth`, `growth-error`, `custom`)                |
| Feed detail/edit + resume, imported feed, end-nap / start-nap prompts, reminder notification, overdue / snoozed / live-partner / offline Home | `design/Phone Flows.dc.html` (`feed-detail`, `feed-imported`, `prompt-endnap`, `prompt-startnap`, `notif-lock`, `home-overdue`, `home-snoozed`, `home-live`, `home-offline`) |
| Sleep, nappy, pump, growth lists, empty state, loading                                                                                        | `design/Phone Lists.dc.html` (`sleep`, `nappy`, `pump`, `growth`, `custom-empty`, `loading`)                                                                                 |
| Sign in, check email, family, add baby, day start, invite, settings, delete account, PWA install (iOS / Android)                              | `design/Phone Account.dc.html` (`signin`, `check-email`, `family`, `add-baby`, `day-start`, `invite`, `settings`, `settings-2`, `delete-confirm`, `pwa-ios`, `pwa-android`)  |
| Web desktop / tablet: home, feeds split view, add-feed dialog, timeline day/week, import steps 1–5, settings                                  | `design/Web.dc.html` (`home`, `feeds`, `feeds-add`, `history-day`, `history-week`, `import-1`…`import-5`, `settings`; `desktop` / `tablet`)                                  |
| Components and tokens                                                                                                                         | `design/Babble Design System.dc.html`                                                                                                                                        |

**Responsive rules (from the design):**

- **Desktop, 1280px and up:** a 268px sidebar with the wordmark, baby switcher, running-session card, nav and online caregivers. Pages use two columns: trackers next to the timeline, and list next to detail. Adding an entry opens a dialog. The sidebar session card is hidden on Home, where the full card already shows.
- **Tablet, 768–1279px:** the sidebar becomes an 84px icon rail, and the running session becomes a pulsing chip. Two-column pages split 1fr / 1fr. The settings section list becomes a select. The week table scrolls sideways.
- **Phone and PWA, under 768px:** a bottom tab bar. Detail panels become full screens and dialogs become bottom sheets. Layouts match the native app exactly. Nothing may scroll the page sideways; nappy and bottle markers that cluster on the day timeline shift along their lane by at most 60% and truncate.
- The design shows the running timer on desktop both as a sidebar card and as a top bar (on Settings). **We need to pick one.**

**Decisions taken from the design:**

- Home has **separate Breastfeed and Bottle rows** (instead of one Feed row with a picker). The Feeds list still combines them, with All / Breast / Bottle filters.
- Home and running cards show **who started** a session (caregiver initials, "Started by Jane").
- Nappy **texture is multi-select** ("Pick any"): runny, seedy, pasty, formed, mucousy, hard, plus loose, pebbles and diarrhea for imported data.
- Two poo colours render as a 135° hard split, first pick top-left. Picking a third is blocked until one is removed.
- Downtime is a dashed neutral dot tagged **"idle"**, never red.
- Running timers use tabular figures. Touch targets are at least 48pt; primary actions are 56pt.
- Undo toast: 6 seconds, paused while touched, sits above the tab bar.
- The feed reminder suggests the **next side** ("ended on Right. Next side: Left") and has a "Start feed · Left" action.
- Bottle "left over" shows the computed "Drank 105 ml".
- The pump finish sheet allows "Save without amounts".
- Custom events use a length stepper, with "Time it with a timer instead".
- Failed saves keep the entry on screen with Retry ("Couldn't save. Your entry is kept here.").
- Invites are a QR code + code (e.g. `K7Q-4MD`) that expires in 7 days and can be used once, plus a share link.
- Deleting an account keeps the baby's records with the family while another member remains. Confirmation is by typing DELETE.
- Huckleberry import can target an existing baby **or create a new one**, and offers a downloadable skipped-rows report.

## Global

- **Phone size, on Expo and on the web PWA:** bottom tabs **Home · Timeline · Stats · Settings**. While any timer runs, Home gets a dot in the running tracker's colour (split in two when two trackers run) that pulses unless everything is paused; the sidebar and icon rail show the same dot, and partners' timers show via realtime. The dot is hidden while you're on Home. The web app at phone width must be as fast to log with as the native app, because self-hosters only have the web app.
- **Desktop web:** left sidebar (Home, Feeds, Sleep, Nappies, Pump, Growth, Custom, Timeline, Stats, Settings). Category lists open as a list + detail split view. Home shows today's timeline next to the tracker rows.
- Dark mode follows the system, with an optional "dark at night" mode. Large touch targets for one-handed use. Every destructive action has an undo toast. All times are editable.
- Timers show elapsed time computed from `started_at`, so they're correct on every device.

## 1. Onboarding / Auth

**Public pages (web):** `/welcome` is the landing page for signed-out visitors to `/` (the installed app goes straight to `/sign-in`). It has a hero with a live preview built from the real Home components and sample data, a feature grid, an example day timeline with totals, a privacy and open-source section, and a footer. `/privacy` and `/terms` are plain readable pages; the operator name and contact come from `OPERATOR_NAME` and `CONTACT_EMAIL` and fall back to "the people who run this babble server". Sign-in shows "By continuing you agree to the Terms of use and Privacy policy", and Settings has an About section with both links (Expo opens them in the browser).

Sign in (magic link / Apple / Google) → create or join a family (via invite code) → add baby (name, birth date, sex (optional, for WHO growth percentiles), timezone auto-detected) → set day start (default midnight) → Home.
Self-hosted with `SIGNUP_MODE=invite_only`: sign-up requires an invite link.
Web prompts "Add to Home Screen" on phones once the user is signed in.

## 2. Home (dashboard)

```
┌──────────────────────────────────────┐
│ Mila · 7w 2d                    [⚙]  │
│ Next feed due in 42m · around 3:02 pm│
├──────────────────────────────────────┤
│ ● Feeding   LEFT 06:12  ▸▸           │  ← running session card, tap → timer
├──────────────────────────────────────┤
│ Sleep        last 1h 05m ago     [+] │
│ Feed         last 2h 14m ago (R) [+] │
│ Nappy        last 40m ago        [+] │
│ Solids       last 3h ago         [+] │
│ Pump         last 5h ago         [+] │
│ Growth       3 Oct · 4.8kg       [+] │
│ Custom       yesterday           [+] │
├──────────────────────────────────────┤
│ Today: 🌙 9h 40m · 🍼 6 · 💩 4        │
└──────────────────────────────────────┘
```

- Tapping a row opens the category list. **+** opens the add flow: a timer for sleep, feed and pump, a form for the others.
- The Feed **+** opens a sheet: Breast (L / R) or Bottle.
- Running sessions sit at the top as cards with inline controls (switch side, pause, stop).
- When feed reminders are on (Settings → Tracking → Feed reminders: Off, 2h, 2h 30m, 3h, 3h 30m, 4h), a line under the running cards says "Next feed due in 42m · around 3:02 pm · Left side next", "Feed due now" or "Overdue 10m · was due 3:02 pm" (caution tone), counted from the start of the latest breast or bottle feed. It's hidden while a breastfeed is running, and during the night window when Feed reminders → At night is set to Quiet.
- Quick-add nappy (backlog): long-press the Nappy **+** for one-tap Wet / Dirty / Both using the last-used details, with undo.

## 3. Category list (one design, configured per tracker)

- Header: tracker name, filter (e.g. Feed: All / Breast / Bottle), **+**
- Summary strip under the header: three figures, each with a small note. Tapping it opens Stats. "Today" figures note the average over the last 7 finished days.
  - Feeds and Breast: Last feed (or Feeding for) · Today · Next side
  - Bottle: Last bottle · Today (ml) · Per bottle
  - Solids: Last meal · Today (meals) · Foods (different foods this week)
  - Sleep: Awake for (or Asleep for) · Today · Naps
  - Nappies: Last change · Wet today · Dirty today, with the latest poo colour
  - Pump: Last pump (or Pumping for) · Today (ml) · Left / right today
  - Growth: Weight and Length with their WHO percentile · Change since the previous weight
  - Custom: Last · Today · 7 days
- Rows grouped by day, using the baby's day start:
  - Feed: `14:02 · R 12m · ⏸ 7m · L 10m`, sides in the order they happened
  - Pump: `11:30 · L 12m · 80 ml · R 10m · 70 ml · ⏸ 2m`, total ml on the right
  - Solids: `11:30 · [Avocado, Pear] · Loved it`, how much on the right
  - Nappy: `09:15 · [Both] · Seedy · ● Mustard · Check` (Check for red, black or white poo), size on the right
  - Sleep: wake-ups and awake chips, then location chips (Cot, Bassinet) and mood ("Upset → happy")
  - Running entries show an "In progress" pill
  - Imported feeds show a small "imported" tag, with no downtime figure
  - Growth: the entry on the birth date is grouped as "Birth"; notes become the subtitle
- Swipe left (mobile) or a row menu (web) to delete, with undo. Tap to open detail/edit.
- Day header: "Today" with the date underneath ("Tue 6 Oct"), and the day's total on the right per tracker: "2 sleeps · 2h 37m" (time asleep), "3 · 2 wet · 2 dirty", "1 session · 115 ml", "4 bottles · 360 ml", "2 meals · 3 foods", "+40 g since 2 Oct", "3 events". Feeds add "· 90 ml" when bottles are included.

## 4. Breast feed timer

```
┌──────────────────────────────────────┐
│ Feeding · started 14:02     [Done]   │
│        ┌────────┐  ┌────────┐        │
│        │  LEFT  │  │ RIGHT  │        │
│        │ 10:32  │  │  ▶     │        │
│        └────────┘  └────────┘        │
│              [ ⏸ Pause ]             │
│ Session                              │
│  Left       10m 32s                  │
│  Downtime    3m 02s   (live while    │
│                        paused)       │
│ Total feeding 10m 32s · lost 3m 02s  │
│                             [Notes]  │
└──────────────────────────────────────┘
```

- Tapping the inactive side ends the current segment and starts the other side.
- Tapping the active side pauses. Tapping it again resumes the same side, which adds a new segment and a downtime row if the gap was over the threshold.
- The start screen has a context line: "Last feed ended on Right, 2h 14m ago. Next side: Left." (or "No breastfeeds logged yet. Start on either side."); pump "Last pump 6h 02m ago · 90 ml."; sleep "Awake 1h 05m since the last nap." If one is already running it shows "Right · 12m 23s · started by Jane" with Open timer.
- Paused sessions look paused: the live dot turns the downtime colour and stops pulsing, and the timer turns grey. A paused feed or pump shows "Paused for 1m 12s", marks the last side "· last", and the growing idle row reads "idle · counting".
- Running cards show "Started by Jane" next to the avatar at every width.
- On the start screen, the suggested side carries a "Next" tag: the opposite of the side the last breastfeed ended on. Both sides stay one tap to start.
- Start → if a nap is running, show the "End nap?" sheet first (Stage 2).
- Once the feed has started (and after saving a bottle), a "Change Olivia's nappy?" sheet in the same style asks "Yes, log a nappy" or "Not now". Yes opens the usual Log nappy form, and saving it returns to the feed. It's skipped when a nappy was logged within 30 minutes of the feed's start, and it waits until any "End nap?" or "Is Olivia asleep?" sheet has been answered.
- Done → "Start nap?" sheet with "now" or "at feed end" (Stage 2).
- Starting a nap while a breastfeed is running shows an "End feed?" sheet: "End feed" (at the nap's start) or "Keep feeding". A running pump is left alone.
- Forgot to start the other side? On the live session page, the idle row just before the current side has a **−** button. Each tap takes a minute off by starting the current side a minute earlier, never before the previous side ended (`set_switch_time`).
- "Ended earlier?" under Finish (on every running feed, pump and nap card) offers 5, 10, 15 and 30 min ago plus a time picker. The end can't be in the future, or before the nap started, the current side started, or (when paused) the last side finished; picks that would break that are disabled. A backdated end closes the open side at that time.

## 5. Feed session detail / edit

- Under the title: "Started by Jane · 6 Oct, 2:02 pm" for entries started from a timer ("Logged by" for entries logged after the fact), then "Ended by John at 2:32 pm": who pressed Stop and when they pressed it, which can differ from the (backdated or edited) end time. Shown on every timed entry: feeds, pumps and naps.
- The segment list as above, with each row editable (side, duration, downtime). Changes recompute timestamps in order from the session start.
- Add a segment, delete a segment, edit the start time.
- **Resume feed** button, shown only on the most recent feed (Stage 2).

## 6. Bottle form

Content (breast milk / formula / mixed / other) as a segmented control. Amount stepper (±10ml, plus a keypad). Optional "left over". Time (defaults to now). Notes.

## 6a. Solids form

**Foods** as chips: recent foods first (newest first), then common first foods (Avocado, Banana, Kūmara, Pumpkin, Apple, Pear, Carrot, Egg, Yoghurt), up to 12. Tap to pick or unpick; picked chips use the `solids` tint with a check. An "Add a food" field with an **Add** button (Enter adds too) for anything else; names are tidied and repeats are ignored regardless of case. At least one food is required, up to 20, each up to 40 characters. Foods never logged before show as "First try: Egg". **How much**: A taste / Some / Lots. **Reaction**: Loved it / Liked it / Not sure / Disliked it. Both are optional and tap again to clear. Time (defaults to now). Notes.

Solids are an instant entry. They show in the feed lane of the day timeline as a `solids` marker with the first food ("Avocado +1"), a Solids card in the day totals when there were any (meals, foods, last time), and the 7-day view's feed ticks. Solids don't count as feeds for the feed count or reminders.

## 7. Sleep timer / form

A big timer with Start/Stop. "Started earlier?" lets you adjust the start time. Location chips (cot, bassinet, pram, car, contact, nursing). Optional "how it went" (fell asleep fast / took a while, woke on their own / woken). Manual entry with start and end pickers.

**Pause nap / Resume nap** sit beside End nap. Pausing marks the baby awake (the card reads "Awake · nap paused"); resuming starts a new stretch of sleep. The big timer shows time asleep, with "awake 12m · 2 wake-ups" beside it once there's been a pause. Lists show the asleep time with "2 wake-ups" and "awake 12m" chips, totals and stats count only time asleep, and the day timeline draws the awake gaps as a dashed outline. Stopping a paused nap ends it when it was paused, and paused naps are auto-ended by the same "Auto-end paused sessions after" setting as feeds.

Naps have a **Session** list like feeds: Asleep and Awake rows with "Total asleep · awake" underneath. It's shown on the live nap screen, on a finished nap's page, and in the nap edit form. On a live nap, the Awake row just before the current stretch has a **−** that takes a minute off (sleep resumed a minute earlier, `set_switch_time`). In the edit form every wake-up has **−** and a delete button, and "Add a wake-up" adds ten minutes awake in the middle of the longest stretch. Stretches that end up touching join into one, and only real gaps count as wake-ups.

While a nap is running, its timer screen has a **Details** card under the timer: where, how long it took to fall asleep, mood going down, mood on waking, woken by a carer, and notes. Each change saves straight away without stopping the timer (notes save when the field is left), and shows up live for other caregivers. The end-of-nap edit screen still offers end mood and "woken by a carer".

## 8. Nappy form

```
Type:    [ Wet ] [ Dirty ] [ Both ] [ Dry ]
Wet:     tiny · little · medium · large · massive        (optional)
Colour:  ● ● ● ● ● ● ● ● ●   (pick up to 2; shown as a split swatch)
Size:    tiny · little · medium · large · massive
Texture: runny · seedy · pasty · formed · mucousy · solid  (pick any)
Rash:    [ ]
Time:    now ▾          Notes
                         [Save]
```

A new nappy starts with no type selected, and Save stays disabled until one is picked. Colour, size and texture only appear for Dirty or Both. Wet size only appears for Wet or Both.

## 9. Pump timer / form

The same layout and behaviour as the breast feed timer: L/R segments, pause, downtime rows. On Done, ask for amounts: left ml and right ml, with a computed total, or "total only". Manual entry is also available.

## 10. Growth form

Weight, length and head circumference, each optional. Date. Units follow settings. Each empty field's placeholder shows that measurement's most recent value and date, e.g. "Last: 4.8 kg · 3 Oct", taken from the latest entry that recorded it.

## 11. Custom event form

Title (with suggestions from past titles), description, start time, optional duration or end time, plus an optional timer.

## 12. Timeline: Day

Date switcher (‹ Tue 7 Oct ›). A vertical timeline from day start to day start, with coloured blocks for sleep, feeds and pumps and markers for nappies. Breastfeeds draw each side in its own colour (`feed-left`, `feed-right`), with the idle gaps between sides as a dashed `downtime` outline. Totals per tracker below; the Feeds card shows Left, Right, Idle and Bottle. Tapping a block opens that event. On desktop, the timeline and totals sit side by side.

## 13. Timeline: 7d

The last 7 days (ending today, or on the chosen day) as 7 columns on every screen size, each a 24h strip of sleep blocks, feed ticks (breastfeeds drawn per side in the left and right colours) and nappy dots; tap a column to open that day. A summary strip (average sleep, longest stretch, feeds/day) above, and a daily totals table with an average column below; feed time has separate Left, Right and Idle rows. Arrows move back and forward 7 days at a time.

## 14. Settings

Baby profile (name, birth date, sex, timezone) · Caregivers & invites · Day start time · Units · Feed reminders (interval for the baby, opt-in for me) · Downtime merge threshold · Auto-end paused sessions after · Import from Huckleberry (web) · Export data · Theme · Account (delete account).

**Export data** (under Data) downloads a JSON file on web, or opens the share sheet with the file on mobile. It contains the baby's profile, settings and every event with its details and timed segments, including deleted events (with `deletedAt` set). The file has `format: "babble-export"` and `version: 1` so it can be imported again later. "Export whole family" appears when the family has more than one baby.

**Caregivers** lists members, then pending invites for editors: the code, "Caregiver · by John · Expires in 6 days" and a Revoke button that asks "Revoke this invite? The code will stop working." The heading reads "Caregivers · 1 pending". Onboarding creates one invite per family, shown on its last step.

**Theme:** System · Light · Dark · Dark at night. Dark at night is dark inside the active baby's night window (Tracking → Night, in the baby's timezone) and light outside it, checked every minute; the web caches the window on the device so the first paint is right. Without a window yet it follows the system.

**Install app** (web): Settings → App explains how to add babble to the home screen, or says "Installed". Home also shows a dismissible card when the app isn't installed: iPhone Safari gets the Share → Add to Home Screen steps, other iPhone browsers are told to open babble in Safari, and Chrome and Edge get an Install button. "Not now" hides it for 14 days.

## 15. Import (Stage 5, web only)

Upload the Huckleberry CSV → choose target baby + confirm timezone → preview (counts per type, date range, skipped rows with reasons, warnings) → import → summary. Re-importing the same file adds only new rows.

## 16. Food intake (Stage 6, parked)

To be designed when the stage starts.

## 17. Stats (Phase 2)

A range picker (7d / 30d / All) and one card per tracker: figure tiles (daily averages over finished days; Feeds adds "Breast per day", e.g. "L 42m · R 38m · idle 9m") and a stacked bar chart per day, weekly averages for long ranges. Nappies also show recent poo colours. Pump appears only when there was pumping, and its Left / right figure is per day. Hovering or focusing a bar on the web shows a tooltip ("7 Oct: Night 5h, Naps 4.5h"); on Expo, tapping a bar shows the same line above the chart. On the first day, figures read "Today so far" and drop "per day", and per-day-only figures are hidden. A Growth card (all entries, not range-limited) charts weight, length and head against the WHO percentile curves and shows the latest percentile; without a sex it asks for one in Settings. See [Stage 7](stages/07-stats.md).
