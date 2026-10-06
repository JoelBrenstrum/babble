# UI Plan

Each screen is specified once here and built twice: in `apps/mobile` (Expo) and `apps/web` (TanStack Start).

This file is the **functional** spec: what each screen does and contains. The **visual** design lives in [design/](design/README.md) (Claude Design export, "Sage" direction). Where a design exists, it wins on layout and styling, and the ASCII sketches below are only a fallback.

All screens are in light and dark. The `.dc.html` files take a `screen` prop (shown in brackets).

| Screen | Design |
|---|---|
| Overview + responsive rules | `design/Babble Screens v1.1.dc.html` |
| Home, breastfeed timer, nappy form, feeds list, history day/week (phone) | `design/Screen.dc.html` (`home`, `timer`, `nappy`, `feeds`, `day`, `week`), `design/Phone.dc.html` |
| Bottle (+ keypad), sleep timer / details / manual, pump timer + finish sheet, growth (+ error state), custom event | `design/Phone Forms.dc.html` (`bottle`, `bottle-keypad`, `sleep`, `sleep-details`, `sleep-manual`, `pump`, `pump-finish`, `growth`, `growth-error`, `custom`) |
| Feed detail/edit + resume, imported feed, end-nap / start-nap prompts, reminder notification, overdue / snoozed / live-partner / offline Home | `design/Phone Flows.dc.html` (`feed-detail`, `feed-imported`, `prompt-endnap`, `prompt-startnap`, `notif-lock`, `home-overdue`, `home-snoozed`, `home-live`, `home-offline`) |
| Sleep, nappy, pump, growth lists, empty state, loading | `design/Phone Lists.dc.html` (`sleep`, `nappy`, `pump`, `growth`, `custom-empty`, `loading`) |
| Sign in, check email, family, add baby, day start, invite, settings, delete account, PWA install (iOS / Android) | `design/Phone Account.dc.html` (`signin`, `check-email`, `family`, `add-baby`, `day-start`, `invite`, `settings`, `settings-2`, `delete-confirm`, `pwa-ios`, `pwa-android`) |
| Web desktop / tablet: home, feeds split view, add-feed dialog, history day/week, import steps 1–5, settings | `design/Web.dc.html` (`home`, `feeds`, `feeds-add`, `history-day`, `history-week`, `import-1`…`import-5`, `settings`; `desktop` / `tablet`) |
| Components and tokens | `design/Babble Design System.dc.html` |

**Responsive rules (from the design):**
- **Desktop, 1280px and up:** a 268px sidebar with the wordmark, baby switcher, running-session card, nav and online caregivers. Pages use two columns: trackers next to the timeline, and list next to detail. Adding an entry opens a dialog. The sidebar session card is hidden on Home, where the full card already shows.
- **Tablet, 768–1279px:** the sidebar becomes an 84px icon rail, and the running session becomes a pulsing chip. Two-column pages split 1fr / 1fr. The settings section list becomes a select. The week table scrolls sideways.
- **Phone and PWA, under 768px:** a bottom tab bar. Detail panels become full screens and dialogs become bottom sheets. Layouts match the native app exactly.
- The design shows the running timer on desktop both as a sidebar card and as a top bar (on Settings). **We need to pick one.**

**Decisions taken from the design:**
- Home has **separate Breastfeed and Bottle rows** (instead of one Feed row with a picker). The Feeds list still combines them, with All / Breast / Bottle filters.
- Home and running cards show **who started** a session (caregiver initials, "Started by Jaimi").
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

- **Phone size, on Expo and on the web PWA:** bottom tabs **Home · History · Stats · Settings**. The web app at phone width must be as fast to log with as the native app, because self-hosters only have the web app.
- **Desktop web:** left sidebar (Home, Feeds, Sleep, Nappies, Pump, Growth, Custom, History, Stats, Settings). Category lists open as a list + detail split view. Home shows today's timeline next to the tracker rows.
- Stats is hidden until Phase 2.
- Dark mode follows the system, with an optional "dark at night" mode. Large touch targets for one-handed use. Every destructive action has an undo toast. All times are editable.
- Timers show elapsed time computed from `started_at`, so they're correct on every device.

## 1. Onboarding / Auth
Sign in (magic link / Apple / Google) → create or join a family (via invite code) → add baby (name, birth date, timezone auto-detected) → set day start (default midnight) → Home.
Self-hosted with `SIGNUP_MODE=invite_only`: sign-up requires an invite link.
Web prompts "Add to Home Screen" on phones once the user is signed in.

## 2. Home (dashboard)
```
┌──────────────────────────────────────┐
│ Mila · 7w 2d                    [⚙]  │
│ Next feed due in 42m                 │
├──────────────────────────────────────┤
│ ● Feeding   LEFT 06:12  ▸▸           │  ← running session card, tap → timer
├──────────────────────────────────────┤
│ Sleep        last 1h 05m ago     [+] │
│ Feed         last 2h 14m ago (R) [+] │
│ Nappy        last 40m ago        [+] │
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
- Quick-add nappy (backlog): long-press the Nappy **+** for one-tap Wet / Dirty / Both using the last-used details, with undo.

## 3. Category list (one design, configured per tracker)
- Header: tracker name, filter (e.g. Feed: All / Breast / Bottle), **+**
- Rows grouped by day, using the baby's day start:
  - Feed: `14:02 · L 10m · R 12m · ⏸ 7m`
  - Pump: `11:30 · L 12m 80ml · R 10m 70ml · ⏸ 2m`
  - Nappy: `09:15 · Dirty · ● green ● yellow · Medium`
  - Imported feeds show a small "imported" tag, with no downtime figure
- Swipe left (mobile) or a row menu (web) to delete, with undo. Tap to open detail/edit.
- Day header shows the day's total (e.g. "6 feeds · 1h 48m").

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
- Start → if a nap is running, show the "End nap?" sheet first (Stage 2).
- Done → "Start nap?" sheet with "now" or "at feed end" (Stage 2).

## 5. Feed session detail / edit
- The segment list as above, with each row editable (side, duration, downtime). Changes recompute timestamps in order from the session start.
- Add a segment, delete a segment, edit the start time.
- **Resume feed** button, shown only on the most recent feed (Stage 2).

## 6. Bottle form
Content (breast milk / formula / mixed / other) as a segmented control. Amount stepper (±10ml, plus a keypad). Optional "left over". Time (defaults to now). Notes.

## 7. Sleep timer / form
A big timer with Start/Stop. "Started earlier?" lets you adjust the start time. Location chips (cot, bassinet, pram, car, contact, nursing). Optional "how it went" (fell asleep fast / took a while, woke on their own / woken). Manual entry with start and end pickers.

## 8. Nappy form
```
Type:    [ Wet ] [ Dirty ] [ Both ] [ Dry ]
Wet:     tiny · little · medium · large · massive        (optional)
Colour:  ● ● ● ● ● ● ● ● ●   (pick up to 2; shown as a split swatch)
Size:    tiny · little · medium · large · massive
Texture: runny · seedy · pasty · formed · mucousy · hard  (pick any)
Rash:    [ ]
Time:    now ▾          Notes
                         [Save]
```
Colour, size and texture only appear for Dirty or Both. Wet size only appears for Wet or Both.

## 9. Pump timer / form
The same layout and behaviour as the breast feed timer: L/R segments, pause, downtime rows. On Done, ask for amounts: left ml and right ml, with a computed total, or "total only". Manual entry is also available.

## 10. Growth form
Weight, length and head circumference, each optional. Date. Units follow settings.

## 11. Custom event form
Title (with suggestions from past titles), description, start time, optional duration or end time, plus an optional timer.

## 12. History: Daily
Date switcher (‹ Tue 7 Oct ›). A vertical timeline from day start to day start, with coloured blocks for sleep, feeds and pumps and markers for nappies. Totals per tracker below. Tapping a block opens that event. On desktop, the timeline and totals sit side by side.

## 13. History: Weekly
7 columns on desktop or 7 rows on a phone, each a 24h strip of sleep and feed blocks. Below, daily totals: sleep hours, feed count, nappies. Swipe or arrows to move between weeks.

## 14. Settings
Baby profile · Caregivers & invites · Day start time · Units · Feed reminders (interval for the baby, opt-in for me) · Downtime merge threshold · Auto-end paused sessions after · Import from Huckleberry (web) · Export data · Theme · Account (delete account).

## 15. Import (Stage 5, web only)
Upload the Huckleberry CSV → choose target baby + confirm timezone → preview (counts per type, date range, skipped rows with reasons, warnings) → import → summary. Re-importing the same file adds only new rows.

## 16. Food intake (Stage 6, parked)
To be designed when the stage starts.

## 17. Stats (Phase 2)
Cards with charts per tracker, and a range picker (7d / 30d / all). See [Stage 7](stages/07-stats.md).
