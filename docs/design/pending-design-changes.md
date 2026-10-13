# Pending design changes

UI changes made in code that the Claude Design project doesn't have yet. Paste a section into Claude Design (the Babble project), apply it, re-export, and sync the export into `docs/design/`. Delete a section once it's synced.

---

## 2026-10-09 · Small differences from the design in the polish batch

Paste everything below this line into Claude Design.

> A few details the apps now do differently from the Sage screens. Update the screens to match. Light and dark.
>
> - **Stats on phone (`Stats Cards.dc.html`):** before a bar is tapped, a meta ink-3 hint above the chart reads "Tap a bar to see its day"; the tapped bar is drawn at 0.8 opacity with the readout line in its place. In the weekly view (All range), the readout starts "Week of 29 Sep: …".
> - **Already-running card on start screens (`Phone Forms.dc.html` start-running):** a small secondary "Open timer →" button sits on the right of the card. The "Only one feed can run at a time." context line is dropped.
> - **Home latest entries (`Screen.dc.html` home):** the latest sleep shows its time asleep, the latest pump its total ml, and a "Both" nappy reads "Both · Medium".
> - **Check-email screen (`Phone Account.dc.html` check-email, `Auth Form.dc.html`):** no mail icon and no "Open email app"; the copy keeps "The link works for an hour", with "Resend in 0:42" (disabled, counting down) turning into a "Resend link" button, and "Use a different email" below.

---

## 2026-10-09 · Next feed due on Home, and the Feed reminders setting

Paste everything below this line into Claude Design.

> Two additions (`Screen.dc.html` home, `Web.dc.html` home, `Phone Account.dc.html` settings). Light and dark.
>
> - **Home:** below the running session cards and above the "Sleep today · Feeds · Nappies" card, a full-width rounded-card line with a Lucide `alarm-clock` icon and body semibold text. Normally `feed-right-soft` background with `on-feed-right` text: "Next feed due in 42m · Left side next" (the side part only when a breastfeed has been logged). Within a minute it reads "Feed due now · Left side next". When overdue it switches to `caution-soft` with `on-caution` text: "Overdue 10m · Left side next". It's hidden while a breastfeed is running and when reminders are off. Show all three states.
> - **Settings → Tracking:** a "Feed reminders" chip row at the top: Off · 2h · 2h 30m · 3h · 3h 30m · 4h (single select, the selected chip with a check), with the hint "Home shows when the next feed is due, counted from the start of the last feed." When a reminder interval is chosen, an "At night" segmented control follows: Remind · Quiet, with the hint "Quiet hides feed reminders during the night set below."

---

## 2026-10-09 · Pending invites, Dark at night, and the install card

Paste everything below this line into Claude Design.

> Three settings and Home details that differ from the Sage screens (`Phone Account.dc.html`, `Web.dc.html` settings and home). Light and dark.
>
> - **Pending invites:** in Settings → Caregivers, below the member rows and styled like them, one row per pending invite: the code in tabular figures ("K7Q4M-D2XPA"), then meta ink-2 "Caregiver · by John · Expires in 6 days", with a ghost danger "Revoke" button on the right. Tapping Revoke opens an inline danger-soft panel under the row: "Revoke this invite? The code will stop working." with destructive "Revoke" and ghost "Cancel". The section heading reads "Caregivers · 1 pending".
> - **Theme:** the Appearance segmented control has four options, System · Light · Dark · Dark at night, without icons. When Dark at night is selected, a meta ink-2 hint below reads "Dark between 7:00 pm and 7:00 am, from Olivia's night settings."
> - **Install card on Home (web/PWA):** instead of the iOS popover and Android bottom sheet, an inline card at the bottom of Home with the app icon, "Add babble to your home screen so it opens full screen and can send feed reminders", and either the iPhone steps (Share icon → "Add to Home Screen") or "Not now" and a primary "Install" button. iPhone browsers other than Safari say to open babble in Safari. Settings gets an "App" section with an "Install app" row that expands to the same instructions, or shows "Installed".

---

## 2026-10-09 · Landing page, privacy policy and terms

Paste everything below this line into Claude Design.

> New web pages in the Sage style, light and dark, at 390px and 1280px:
>
> - **Landing page (`/welcome`):** header with the wordmark and "Sign in". Hero: "Track your baby's day, together." (34px, 48px on desktop), subline "Feeds, sleep, nappies and more, shared live with everyone who helps. Free, private and open source.", a primary "Get started" and secondary "See what it does". Beside it on desktop (below on phones) a framed, faded preview of the Home screen with a running breastfeed card. Then "What babble does": a grid of 13 cards, each with a tracker-tinted icon tile, a title and one or two lines. Then "Pause, don't stop": a short paragraph ("In most trackers, stopping for a burp or a wake-up means ending one entry and starting another. In babble you pause instead…") above two framed previews side by side (stacked on phones): a paused breastfeed card ("Feeding · paused", "Paused for 1m 13s", "Right · last") and a paused nap card ("Awake · nap paused", "awake 9m · 2 wake-ups", Resume nap / End nap), each with a one-line caption. Then "See the day at a glance": a framed day timeline preview next to the day totals cards, with captions. Then a surface-coloured "Private and open source" panel with four short points and links to the privacy policy and terms. A closing "Ready when you are" with Get started, and a footer with the wordmark and Sign in · Privacy · Terms · GitHub.
> - **Privacy policy and Terms of use:** a readable single column (max ~65ch) with the wordmark, a title, "Last updated 9 October 2026", section headings, short paragraphs and bullet lists, and "Back to babble" at the end.
> - **Sign-in:** a meta ink-2 line under the form: "By continuing you agree to the Terms of use and Privacy policy." with both as links. **Settings:** an "About" section at the bottom with "Privacy policy" and "Terms of use" rows.

---

## 2026-10-09 · Take idle time off a live feed

Paste everything below this line into Claude Design.

> On the live session page's breakdown (`Screen.dc.html` timer, the "Session" card under the running breastfeed or pump), the Downtime row directly above the current side gets a small round 40px button on the far right after the duration: `raised` background, 1px `line` border, Lucide `minus` in ink. Tapping it takes a minute off the idle (the current side starts a minute earlier), and the row disappears once the gap is gone. Older idle rows and the "idle · counting" row while paused don't get it. Light and dark.

---

## 2026-10-09 · Nap session list with wake-ups

Paste everything below this line into Claude Design.

> Naps get the same "Session" breakdown card as feeds (`Phone Sleep.dc.html` running/paused/resumed, the finished nap page, and the nap edit form in `Phone Forms.dc.html`). Light and dark.
>
> - Rows: "Asleep" with a solid `sleep` dot and the stretch length, and "Awake" with the dashed `session-downtime` dot and its length. The current stretch shows "sleeping" (`on-sleep`), and while paused the last row reads "awake · counting". Footer: "Total asleep 1h 40m" and "awake 12m" on the right.
> - Live nap: the Awake row right above the current stretch has the round 40px **−** button (`raised`, `line` border, Lucide `minus`) that takes a minute off.
> - Edit form: under "Wake-ups", the same card where every Awake row has **−** and a small Lucide `trash-2` delete button, followed by an "Add a wake-up" chip button with a plus. The separate Duration box only shows when there are no wake-ups.


---

## 2026-10-09 · Feed due line shows the time

Paste everything below this line into Claude Design.

> The Home feed due line (info status, `icon-clock`) now includes the clock time in the baby's time zone: "Next feed due in 42m · around 3:02 pm · Left side next". When overdue it uses the caution tone: "Overdue 10m · was due 3:02 pm · Left side next". "Feed due now" stays as it is. Check it wraps cleanly to two lines at 320px, light and dark.

---

## 2026-10-10 · Solids tracker

Paste everything below this line into Claude Design.

> Add a **Solids** tracker to babble, in light and dark, at 390px and 1280px. Its colour is a new `solids` token, an avocado green: `#5e7f1f` / soft `#e6efcf` / on `#3a5212` in light, and `#b5d36e` / soft `#262f14` / on `#dbe9b4` in dark. Please check it reads clearly next to `nappy` and `session-active` and refine it if needed. The icon is Lucide `carrot`.
>
> - **Home:** a Solids row after Bottle: "Last 3h ago · Avocado, Pear", with **+**.
> - **Log solids form:** a "Foods" section of chips. Recent foods come first, then common first foods (Avocado, Banana, Kūmara, Pumpkin, Apple, Pear, Carrot, Egg, Yoghurt). Picked chips use `solids-soft` with an `on-solids` check. Under the chips is an "Add a food" text field with a secondary "+ Add" button, and a meta line "First try: Egg" in `on-solids` for new foods. Then "How much" single chips (A taste / Some / Lots), "Reaction" single chips (Loved it / Liked it / Not sure / Disliked it), Time and Notes. Show the "Add at least one food." error state.
> - **Solids list:** a summary strip of Last meal · Today (meals, avg note) · Foods (count, "this week"). Rows read `4:17 pm · [Avocado, Scrambled egg] (solids pill) · [Loved it] (neutral pill)`, with "Some" on the right. The day header total is "2 meals · 3 foods".
> - **Day timeline:** a `solids` marker in the feed lane ("Avocado +1"). The day totals get a Solids card (carrot tile) after Feeds, with Foods and Last rows, shown only on days with solids. The 7-day view gets solids ticks in the feed column.

---

## 2026-10-10 · Nappy prompt when a feed starts

Paste everything below this line into Claude Design.

> Add a fourth sheet to the feed/nap prompts in `Phone Flows.dc.html`, in the same style as `prompt-endnap`, in light and dark. Use a `nappy-soft` round tile with a Lucide `droplets` icon in `on-nappy`, the title "Change Olivia's nappy?" and the body "Log a nappy change with this feed." Buttons: a primary "Yes, log a nappy" and a ghost "Not now". It appears over the live feed timer right after a breastfeed starts, and after a bottle is saved. Show it at 390px as a bottom sheet and at 1280px as a centred dialog.

---

## 2026-10-11 · Keep screen on during a feed

Paste everything below this line into Claude Design.

> On the live breastfeed (and pump) session screen in `Phone Flows.dc.html`, add a "Keep screen on" card directly under the running card, in light and dark at 390px and 1280px. It's a raised card with a `surface` round tile holding a Lucide `sun` icon in `ink-2`, the label "Keep screen on" (label, semibold), a meta hint in `ink-2`, and an iOS-style switch on the right (`primary` track when on, `line-strong` when off). Hints: off "Let the screen sleep as usual."; on and charging "Stays on while this screen is open. Plugged in."; on battery "Stays on while this screen is open. On battery, so plug in if you can."; battery unknown "Stays on while this screen is open." Keep the switch's tap area at least 44px.

---

## 2026-10-11 · A colour for each family member

Paste everything below this line into Claude Design.

> Family member avatars are no longer all peach. Each member gets a colour in the order they joined: 1 `secondary-soft` / `on-secondary-soft` (peach), 2 `growth-soft` / `on-growth` (blue), 3 `sleep-soft` / `on-sleep` (lavender), 4 `info-soft` / `on-info` (teal), 5 `pump-soft` / `on-pump` (plum), 6 `bottle-soft` / `on-bottle` (gold), then repeating. Update the avatar stacks in the header and sidebar, the author avatars on entry rows and running cards ("Started by Jane"), and the Settings members list so John is peach and Jane is blue, in light and dark. Check the initials stay readable on each tint and that overlapping avatars in the stack still separate clearly with their ring.

---

## 2026-10-11 · Chair mode (feed station on a wall-mounted touchscreen)

Paste everything below this line into Claude Design.

> Design a new **Chair mode** for babble: a full-screen page shown on a Raspberry Pi touchscreen mounted beside the feeding chair. It is always on, tapped one-handed (often while holding a baby, in the dark), and read from about 1 m away. Use the existing babble design system (tokens, Figtree, Caprasimo wordmark, Lucide icons, `feed-left` / `feed-right` / `bottle` / `nappy` tracker colours). Make a new file `Chair Mode.dc.html` with every state below, each at **800×480** (Pi Touch Display 1) and **1280×720** (Pi Touch Display 2), landscape, in **light and dark**. Dark is the main case because most use is at night.
>
> **Principles:** no navigation, menus, tab bar or scrolling. Every target is at least 88px tall, and the main actions are much bigger. One-tap actions with no confirm dialogs; mistakes are fixed with a 5-second Undo toast. Huge, high-contrast numbers. Nothing animates except the live timer and a soft running pulse.
>
> **1. Idle (no feed running):**
> - Top strip: the baby's name and age on the left, the clock time on the right, small and quiet.
> - A status line: "Last fed 2h 10m ago · Right side · 18m". Below it the feed due line in the info tone ("Next feed due in 42m · around 3:02 pm"), switching to caution when overdue ("Overdue 10m · was due 3:02 pm").
> - Two giant buttons side by side filling most of the screen: **Left** (`feed-left`) and **Right** (`feed-right`), each with a big "L" / "R" and the label "Start left" / "Start right". The suggested next side gets a "Next" badge and a thicker border.
> - A row of smaller secondary buttons underneath: **Bottle** (`bottle`, opens a quick amount picker), **Nappy** (`nappy`) and **Sleep** (`sleep`).
>
> **2. Feeding (breastfeed running):**
> - The current side fills the background with its soft tint (`feed-left-soft` or `feed-right-soft`) and shows "Feeding · Left".
> - A giant total timer (for example "12:34", about 160px at 1280 wide) with the current side's time smaller beneath it: "Left 8:10 · Right 4:24".
> - Three big buttons: **Switch to Right** (the other side's colour), **Pause** (neutral), and **End feed** (primary, solid).
> - A small "Started 2:41 pm by Jane" with Jane's avatar (avatars use the per-member colours: first member peach `secondary-soft`, second blue `growth-soft`).
>
> **3. Paused:** same layout using `session-paused` / `session-paused-soft`. The timer is dimmed with a "Paused 3m" chip, and **Resume** replaces Pause.
>
> **4. Feed ended:** a full-screen summary for 5 seconds: a check icon, "Fed 24m · Left 14m · Right 10m", an **Undo** button, and a large **Log a nappy?** button. Then it returns to Idle.
>
> **5. Quick bottle:** a large sheet over Idle with a big amount stepper (−/+ in 10 ml steps, showing "120 ml"), Breast milk / Formula / Mixed segmented chips, and a large **Save** button. Include a ml and an oz variant.
>
> **6. Quick nappy:** a large sheet with four huge choices: **Wet**, **Dirty**, **Both** and **Dry**. One tap saves and closes with an Undo toast.
>
> **7. Night dim:** a variant of Idle and Feeding at night where the whole UI drops to very low brightness: near-black background, text in a warm muted tone, and tracker colours desaturated, so it doesn't light up the room. Tapping anywhere while dimmed wakes it to normal dark brightness for 30 seconds before the tap does anything else.
>
> **8. Offline / signed out:** a calm full-screen message: "Can't reach babble. Retrying…" with a spinner, and a signed-out state with "Sign in on this screen" and a large button.
>
> Also show a **portrait 480×800** version of Idle and Feeding, for people who mount the screen vertically.

---

## 2026-10-11 · Chair mode as built

Paste everything below this line into Claude Design.

> Small changes to `Chair Mode.dc.html` / `Chair Screen.dc.html` from the build: (1) The baby's name in the top strip is a link back to Home (the only way out on a normal tablet); give it a subtle pressed state. (2) When a nap is running, the Sleep quick button reads "End nap · 32m" and ends it on tap; add that state to Idle. (3) The paused chip says "Just paused" for the first minute, then "Paused 3m". (4) Starting a nap shows the Undo toast "Nap started". (5) Settings gets a "Chair mode" section with a row "Open chair mode" and the hint "A full-screen feed station for a tablet or touchscreen by the feeding chair. It keeps the screen on.", styled like the "Import from Huckleberry" row; add it to the Settings screens in `Phone Account.dc.html` and `Web.dc.html`.

---

## 2026-10-11 · Chair mode: nappy when a feed starts, nap when it ends

Paste everything below this line into Claude Design.

> In `Chair Screen.dc.html`, the **Feed ended** state's big right-hand button is now **"Olivia's asleep"** in solid `sleep` with a Lucide `moon` icon (it starts a nap and shows the "Nap started" Undo toast), replacing "Log a nappy?". When a nap is already running, only Undo shows, at full width. Add a new **Feed started · nappy** state over the Feeding screen: a chair sheet with a `nappy-soft` tile and `droplets` icon, the title "Change Olivia's nappy?", and two big buttons along the bottom: a bordered "Not now" and a solid `nappy` "Yes, log a nappy" (twice as wide). Yes opens the Quick nappy sheet. Show both at 800×480, 1280×720 and portrait, light and dark.

---

## 2026-10-11 · Chair mode: last nappy on the Nappy button, toasts at the top

Paste everything below this line into Claude Design.

> In `Chair Screen.dc.html` Idle, the Nappy quick button gets a second line under "Nappy": the last change and how long ago, e.g. "Wet · 2h 10m ago" (about 3.6cqmin, semibold, `on-nappy` at 80% opacity, tabular figures), left-aligned with the label beside the droplets icon. It's hidden when no nappy has been logged. Check it fits the narrow portrait button. Also move the Undo toast ("Nappy saved · Wet", "Nap started") from the bottom to the top centre (3cqmin from the top, over the status line) so it never covers the quick buttons. A toast without Undo (e.g. "Nap ended") is a shorter pill with no empty button space.

---

## 2026-10-11 · Welcome page: chair mode section

Paste everything below this line into Claude Design.

> On the landing page (`/welcome`), add a 14th feature card "Chair mode" (Lucide `tablet` on a `feed-left-soft` tile): "Turn a tablet or touchscreen by the feeding chair into a feed station, with giant buttons and a screen that stays on." After "Pause, don't stop", add a section "A feed station by the chair" with the paragraph "Chair mode turns an old tablet or a small touchscreen into a babble screen beside the feeding chair. Start a side, switch or pause with one big tap, even holding a baby in the dark. It asks about a nappy when a feed starts, offers a nap when it ends, and dims itself overnight. Open it from Settings." Below it, two framed 16:9 previews side by side (stacked on phones), in the same frame style as the other previews: chair mode Idle in light (caption "Between feeds: when the last one was, what's due, and which side is next.") and chair mode Feeding in dark (caption "During a feed: one big timer and three big buttons, dark at night.").

---

## 2026-10-11 · Chair mode dims in the day too

Paste everything below this line into Claude Design.

> In `Chair Mode.dc.html`, the Night dim note should say chair mode also dims during the day after 5 minutes without a touch, using the same dim palette and "Dimmed · tap to wake" hint, and dims after 30 seconds inside the night window. Add a "Day dim · Idle" frame showing the dim palette over the light-theme idle layout at 800×480 and 1280×720. The screen is only held awake during a feed, so between feeds the device may switch the display off; the first tap after that only wakes it.

---

## 2026-10-11 · Chair mode: Dim now button

Paste everything below this line into Claude Design.

> In `Chair Screen.dc.html`, add a "Dim now" pill to the top strip, just left of the clock: `surface` background, Lucide `moon` icon and label in `ink-2`, about 3.6cqmin text, 6cqmin tall. It dims the screen straight away and is replaced by the "Dimmed · tap to wake" hint while dimmed. Show it on Idle and Feeding in light and dark.

---

## 2026-10-11 · New release banner

Paste everything below this line into Claude Design.

> Add a "new version" banner to the web app, in light and dark, at 390px and 1280px: a dark `ink` card pinned to the top centre (8px below the safe area, max 448px wide) with a Lucide `refresh-cw` icon in `primary-soft`, the text "A new version of babble is ready." in `bg`, a "Refresh" text button in `primary-soft` and a close (×) button. In `Chair Screen.dc.html`, add a "New version" state: the toast-style pill at the top centre with a `refresh-cw` icon in `primary`, "A new version of babble is ready" and a big solid `primary` "Refresh" button.

---

## 2026-10-11 · Person colours separate from tracker colours

Paste everything below this line into Claude Design.

> Replace the family member avatar colours (which reused tracker tokens) with a dedicated person palette, so an avatar never reads as a nap, feed, bottle or nappy. New tokens, each with `-soft` and `on-` variants: `person-1` azure `#2468b0` / soft `#d6e6f7` / on `#154677` (dark `#7fb3ea` / `#14263b` / `#c6def7`); `person-2` raspberry `#b02f5e` / `#f8d9e4` / `#7a1d40` (dark `#ec8fb0` / `#3b1624` / `#f7cadb`); `person-3` cyan `#13808f` / `#d3eef1` / `#0c5660` (dark `#6fcbd6` / `#0f2e33` / `#c2ecf1`); `person-4` charcoal `#4a4d52` / `#e3e4e6` / `#2c2e31` (dark `#b9bdc3` / `#2a2c2f` / `#e2e4e7`). Members get them in join order and repeat after four. Avatars use the soft tint with `on-` initials. Please check each is clearly distinct from every tracker colour (especially azure vs `growth`, raspberry vs `pump` and `feed-left`, cyan vs `nappy`) and refine the hues if needed, then update the avatar stacks, entry rows, running cards, chair mode and Settings members so John is azure and Jane is raspberry.

---

## 2026-10-11 · Stats tooltips with totals, growth point readouts

Paste everything below this line into Claude Design.

> In `Stats Cards.dc.html`: (1) bar tooltips for multi-series charts end with a total, e.g. "7 Oct: Night 5h, Naps 4.5h · Total 9.5h" and "7 Oct: Breast 8, Bottle 1 · Total 9"; single-series bars stay as they are. (2) Growth charts get a hover/tap state on each measured point: the point grows from 3.5 to 5.5 radius and a dark `ink` tooltip (same style as the bar tooltip) sits above it reading "1 Oct · 4.19 kg · 51st percentile" (no percentile part when the sex isn't set or the baby is over 2). Near the left or right edge the tooltip aligns to that edge instead of centring. On the phone (Expo) layout, show a caption line above each growth chart: "Tap a point to see it" in `ink-3`, replaced by the tapped point's readout in `ink` semibold.

---

## 2026-10-11 · Chair mode: discard a feed

Paste everything below this line into Claude Design.

> In `Chair Screen.dc.html` Feeding (and Paused), put a "Discard" pill at the right end of the "Started 2:41 pm by Jane" row: about 12cqmin tall, `raised` at 70% with a `line-strong` border, Lucide `trash-2` icon and label in `ink-2`. It's deliberately smaller than and separate from the Switch / Pause / End feed row so it isn't hit by accident. Tapping it returns to Idle and shows the top toast "Feed discarded" with Undo. Show it at 800×480, 1280×720 and portrait.

---

## 2026-10-11 · Chair mode: idle time, 30-second feed summary

Paste everything below this line into Claude Design.

> In `Chair Screen.dc.html` Feeding and Paused, after "Left 8:10 · Right 4:24" add "Idle 1:12" in `on-session-downtime` with a small dashed `session-downtime` ring before it, shown only when there's idle time (gaps longer than the downtime merge threshold, plus the current pause while paused). The Feed ended state now reads "Left 14m · Right 10m · idle 2m" when there was a minute or more of idle time, stays up for 30 seconds instead of 5, and its footer counts down live: "Back to the start screen in 30s", 29s, 28s…

---

## 2026-10-11 · Rename and remove caregivers; chair last-fed start time

Paste everything below this line into Claude Design.

> (1) Settings → Caregivers (`Phone Account.dc.html` and `Web.dc.html`): for the owner, each other member row gets ghost "Rename" and danger "Remove" text buttons on the right; your own row gets just "Rename" (caregivers and viewers see "Rename" only on their own row). Rename expands the row into a "Jane's name" text field with Save and Cancel. Remove expands a `danger-soft` box: "Remove Jane from The Smiths? They'll lose access straight away. What they logged stays." with a destructive "Remove" and a ghost "Cancel" (same pattern as revoking an invite). Show the rename and remove states in light and dark. (2) In `Chair Screen.dc.html` Idle, the status line now leads with the last feed's start time: "Last fed 1:32 pm · 2h 28m ago · Right side · 18m".

---

## 2026-10-12 · Breastfeed breakdown merges same-side stretches

Paste everything below this line into Claude Design.

> In the breastfeed session breakdown (`Phone Flows.dc.html` feed detail and the live timer's Session card), consecutive stretches on the same side now show as a single row, with the pauses between them combined into one "Downtime · idle" row right after it. For example Left 5m, pause 1m, Left 6m reads "Left 11m" then "Downtime 1m". A finished side shorter than the merge threshold (e.g. "Right 3s" from a mistaken tap) is left out entirely. Show a breakdown example with Left, Downtime, Right, Downtime rows and one where three Left stretches collapse into "Left 13m" + "Downtime 3m" (the minus button for taking a minute off idle sits on that downtime row).

---

## 2026-10-12 · Stats 24h and Today, nappy question timing, chair full screen

Paste everything below this line into Claude Design.

> (1) `Stats Cards.dc.html`: the range picker becomes 24h / Today / 7d / 30d / All. On 24h and Today the figure tiles are totals ("Last 24h" or "Today so far" as the first tile label, no "per day"), and each chart has one bar per clock hour (24–25 bars), with the axis reading e.g. "6 pm" on the left and "Now" on the right and tooltips like "2 pm: Breast 0, Bottle 1 · Total 1". The caption reads "Totals for the last 24 hours, charted hour by hour." / "Totals for today so far, charted hour by hour." (2) Settings → Tracking (`Phone Account.dc.html`, `Web.dc.html`): add "Ask about a nappy" single-choice chips — When a feed starts / After the first side / When the feed ends / Don't ask — with the hint "When to ask about a nappy change during a breastfeed. Bottles ask after saving." The "Ignore gaps shorter than" hint becomes "Short pauses, like switching sides, won't show as downtime, and a side shorter than this is left out." (3) `Chair Screen.dc.html`: add a "Full screen" / "Exit full screen" pill (Lucide `maximize` / `minimize`, same style as "Dim now") to the top strip, left of Dim now.

---

## 2026-10-12 · Chair mode: 10-second feed summary

Paste everything below this line into Claude Design.

> In `Chair Screen.dc.html`, the Feed ended state now stays up for 10 seconds (not 30); its footer counts down "Back to the start screen in 10s", 9s, 8s…

---

## 2026-10-12 · 24h moves from Stats to the Timeline

Paste everything below this line into Claude Design.

> Undo the 24h range on Stats (the picker is Today / 7d / 30d / All). Instead, the Timeline's view switch becomes Day / 24h / 7d (`Screen.dc.html` day/week, `Web.dc.html` timeline). 24h shows the same vertical day timeline and the same totals cards, but for the rolling last 24 hours: the header reads "Last 24 hours" with no date arrows, hour ticks fall on clock hours (e.g. 06, 09, 12…), and the now line sits at the end. Show it at 390px and 1280px, light and dark.

---

## 2026-10-13 · Breastfeed breakdown: pauses start new rows again

Paste everything below this line into Claude Design.

> Correction to "Breastfeed breakdown merges same-side stretches": a pause at or over the merge threshold now starts a new row with a Downtime row before it, even on the same side (Right 10m, Left 5m, Downtime 5m, Left running). Only pauses shorter than the threshold merge into one row. A finished side shorter than the threshold (e.g. "Right 3s") is still left out.

---

## 2026-10-13 · Predicted sleeps and feeds (Plus)

Paste everything below this line into Claude Design.

> Add predictions, a Babble Plus feature. (1) Home (`Phone.dc.html`, `Web.dc.html` home): under the feed-due line, a second full-width soft card in the sleep tone (`sleep-soft` background, `on-sleep` text, Lucide `moon` icon) reading "Likely asleep around 10:20 am", or "Likely awake around 3:20 pm" while a nap is running. (2) Timeline day view for today (`Screen.dc.html` day, `Web.dc.html` timeline): after the now line, the Sleep and Feeds lanes show the next ~4 hours of likely blocks as 2px dashed outlines (`sleep` border on `sleep-soft` in Sleep, `feed-left` border on `feed-left-soft` in Feeds), rounded, not tappable, fading from full opacity at the now line to about 35% four hours out. Under the timeline, a caption in `ink-3`: "Dashed blocks show likely sleeps and feeds for the next few hours." Show it at 390px and 1280px, light and dark, with one running nap continuing as a dashed block past the now line.


---

## 2026-10-13 · Chair mode: one tap wakes and acts

Paste everything below this line into Claude Design.

> In `Chair Mode.dc.html`, change the Night dim note and the "Night dim · Feeding" frame caption: a tap while dimmed now wakes the screen and also presses whatever was tapped, so it no longer needs a second tap. Keep the "Dimmed · tap to wake" hint.

---

## 2026-10-13 · Settings: Babble Plus section

Paste everything below this line into Claude Design.

> In Settings (`Phone Account.dc.html`, `Web.dc.html` settings), add a "Babble Plus" section between Caregivers and Tracking, shown only when billing is on. One card: a Lucide `sparkles` icon in `primary` with the plan name ("Plus" or "Free") as the row title, and on Plus an "Active" chip (`primary-soft` background, `on-primary-soft` text) on the right. Below it a body line in `ink-2`: "Your family has Plus. Everyone in the family gets it." or "You're on the free plan. Upgrading is coming soon." Then a small `ink-2` label ("Included" on Plus, "Plus adds" on Free) and a checklist with `primary` check icons: "Predicted sleeps and feeds on Home and the Timeline". No upgrade button yet. Show both states at 390px and 1280px, light and dark.

---

## 2026-10-13 · Plus badge, Plus popup, locked "Add a baby"

Paste everything below this line into Claude Design.

> (1) A reusable **Plus badge**: a small chip (`primary-soft` background, `on-primary-soft` text, caption weight bold) with a 12px Lucide `sparkles` icon and the word "Plus". (2) A reusable **Plus popup** (bottom sheet on phone, centred dialog on desktop, same frame as the nap prompt): `sparkles` in a 44px `primary-soft` circle next to the heading "Babble Plus", a body line in `ink-2` that names the locked feature (e.g. "Adding more than one baby to a family is part of Babble Plus."), a checklist with `primary` checks ("Predicted sleeps and feeds on Home and the Timeline", "More than one baby in a family"), a small `ink-2` note "Upgrading is coming soon.", and a full-width secondary "Got it" button. (3) In the baby switcher (`Phone.dc.html` switch-baby sheet, `Web.dc.html` sidebar switcher), for a free family that already has a baby, the "Add a baby" row turns muted: `ink-2` text, a Lucide `lock` in the dashed circle (`line-strong` border instead of `primary`), and the Plus badge on the right. Tapping it opens the Plus popup. Also add "More than one baby in a family" to the Settings → Babble Plus checklist. Show light and dark, 390px and 1280px.

---

## 2026-10-13 · Free plan: two carers

Paste everything below this line into Claude Design.

> In Settings → Caregivers (`Phone Account.dc.html`, `Web.dc.html` settings), when a free family already has two carers, or one carer plus a pending invite, the secondary "Invite a caregiver" button turns muted: `ink-2` label, Lucide `lock` instead of `user-plus`, and the Plus badge after the label (on the phone app the badge sits on a line under the button with "Two carers on the free plan"). Tapping it opens the Plus popup with "A free family can have two carers, counting invites waiting to be accepted. Babble Plus allows more." Add "More than two carers in a family" to the Plus checklist in the popup and in Settings → Babble Plus.


---

## 2026-10-13 · Chair mode: switch baby · Settings: "Family"

Paste everything below this line into Claude Design.

> (1) `Chair Screen.dc.html` / `Chair Mode.dc.html`: when the signed-in person has more than one baby, the baby's name in the top strip becomes a pill (same `surface` pill as "Full screen" and "Dim now", but the name stays bold `ink`) with a small Lucide `chevrons-up-down` after it. Tapping it opens a chair sheet titled "Switch baby" (Lucide `baby` in a `primary-soft` circle, same frame as the bottle and nappy sheets): one big row per baby with the name large and the age small underneath (plus the family name when they belong to more than one family); the current baby's row is `primary-soft` with a check on the right, the others are outlined `raised` rows; at the bottom a full-width `surface` button "Leave chair mode" with a Lucide `log-out` icon. With one baby the name stays a plain bold link to Home, as now. (2) Settings (`Phone Account.dc.html`, `Web.dc.html`): rename the "Caregivers" section heading to "Family" ("Family · 1 pending" with pending invites), and for a Plus family show the Plus badge right after the heading.

---

## 2026-10-13 · Settings: baby, family, device and account groups

Paste everything below this line into Claude Design.

> Rework Settings (`Phone Account.dc.html`, `Web.dc.html` settings) into four groups, each with a `heading` bold title and a one-line `ink-2` meta note under it, 40px between groups and 16px between cards. On desktop, put a row of small `surface` pill links under the "Settings" title ("Olivia · Family · This device · Account") that jump to each group. (1) **"Olivia's settings"** — "These only change things for Olivia.": first a baby picker card (`raised`, 8px padding) with one row per baby (avatar in the baby's tone, bold name, age in `ink-2`); the current baby's row is `primary-soft` with a `primary` check, and with more than one family the rows are grouped under small uppercase family names. A divider, then the "Add a baby" row from the baby switcher (dashed `primary` circle with `plus`, or the locked `ink-2` version with `lock` and the Plus badge). Then a "Profile" card (row-title heading inside, then name, birth date, sex, timezone, day start, Save changes), a "Reminders and night" card (feed reminders, at night, ask about a nappy, night window, with the note "Dark at night follows it too."), the Import from Huckleberry row (web) and an "Export data" card with "Export Olivia". (2) **"Family"** — "Shared by everyone in The Smiths, for every baby.", with the Plus badge after the title for a Plus family: the "Members · 1 pending" section label with the member and invite rows and "Invite a caregiver", the Babble Plus card, a "Units and feeds" card (Units, Ignore gaps shorter than, Finish paused feeds after) and, with more than one baby, an "Export data" card with "Export whole family". (3) **"This device"** — "Only changes this device.": Appearance, Open chair mode, Install app. (4) **"Account"** — "Your sign-in, wherever you use babble.": the account card (no separate Account label) and About. Show one baby and two babies, free and Plus, 390px and 1280px, light and dark.

---

## 2026-10-13 · A Plus icon

Paste everything below this line into Claude Design.

> Design a small mark for **Babble Plus** to replace the Lucide `sparkles` we use today. It must read clearly at 12px inside the Plus badge (a `primary-soft` chip with `on-primary-soft` text "Plus"), at 16–20px in a 36–44px `primary-soft` circle (Plus popup, Patterns card, locked overlays), and alone without the word. It should feel warm and calm like the rest of babble (rounded strokes, 2.75px at 24px like our Lucide icons, no gradients) and not look like a medical plus/cross or a "new" star. Explore 4–6 directions, for example: a crescent moon with a small sparkle, a soft star made of rounded petals, a "+" with rounded ends tucked into a speech-bubble (babble), a tiny sun rising. Show each in the badge, in the circle, and on a locked "Add a baby" row, in light and dark. Deliver the chosen one as a 24×24 SVG on a stroke grid that matches Lucide so it drops into `PlusBadge` and every Plus spot on web and Expo.

---

## 2026-10-13 · Stats patterns, 30-day timeline, Plus overlays

Paste everything below this line into Claude Design.

> (1) **Stats** (`Stats.dc.html`, `Phone.dc.html` stats): the range picker is now 7d · 30d · All (Today is gone). Above the tracker cards add three Plus cards, each with the Plus badge at the top right of its header: **This week** (`calendar-days` in a `primary-soft` circle, subtitle "The last 7 finished days, compared with the 7 before", a bold one-line takeaway like "The longest night stretch is up 40m on last week.", then tiles for Sleep a day, Longest night stretch, Typical wake window, Naps a day, Feeds a day and Nappies a day, each tile with the value and a small `ink-2` change on the right with `trending-up` / `trending-down` / `minus`, e.g. "+40m"); **Wake windows** (`sun` in `primary-soft`, tiles Typical, On last week, First of the day, Second, Third…, Before bed, and a 14-day `primary` bar chart "Typical awake time"); **Night sleep** (`moon-star` in `sleep-soft`, tiles Longest stretch last night, Longest stretch average, On last week, Wake-ups a night, Night sleep, and a 14-night `sleep` bar chart "Longest stretch"). Same card frame and tile style as the existing stats cards. (2) **Timeline 30d** (`Timeline.dc.html`): add 30d to the Day · 24h · 7d switch. One thin row per day (16–20px), oldest at the top, today outlined in `primary`; a weekday + date label on the left ("Mon 12"), hours from the day start across with faint lines every 6 hours and tick labels on top; sleep fills the row in `sleep`, breastfeed sides as thin `feed-left` / `feed-right` marks, bottles as 2px `bottle` marks. Summary strip above. (3) **Locked states**: without Plus, the Patterns area is a single card (sparkles circle, "Patterns", Plus badge, one line explaining it, secondary "See what Plus adds"); the All range and the 30d timeline show the real content blurred (about 6px, 60% opacity) under a centred raised card with the Plus icon in a `primary-soft` circle, the title with the Plus badge ("All-time stats" / "30-day timeline"), one `ink-2` line, and a primary "See what Plus adds" button. (4) The **Plus popup** now ends with a primary "Subscribe to Plus" button (disabled until payments exist, with "Upgrading is coming soon." under it) and a secondary "Not now"; it's the bottom sheet that "Invite a caregiver", "Add a baby" and every Plus overlay open. Show phone and desktop, light and dark, Plus and free.

---

## 2026-10-13 · Prediction line on Timeline, welcome page, Import data

Paste everything below this line into Claude Design.

> (1) **Timeline Day** (`Timeline.dc.html`): for today, put the same `sleep-soft` prediction line as Home ("Likely asleep around 1:59 pm" / "Likely awake around …", Lucide `moon`, `on-sleep` bold text) above the day timeline, with the dashed predicted blocks below as now. When billing is on, the prediction line (on Home and the Timeline) ends with the Plus badge on the right, and the caption under the dashed blocks starts with the Plus badge. (2) **Welcome page** (`Landing.dc.html`): add two feature tiles, "Predicted naps and feeds" (`wand`, `sleep-soft`) and "Patterns" (`trending-up`, `primary-soft`), each with the Plus badge after the title when billing is on; rename "Import from Huckleberry" to "Bring your history" ("Import a Huckleberry export, or move between babble servers with your own export…"). The home preview gains the prediction line and the example-day timeline shows dashed predicted blocks after the now line. After the example day add a section **"Watch the patterns form"** (Plus badge after the heading when billing is on) with a 30-day one-row-per-day timeline preview on the left and, stacked on the right, the "This week" summary card and the "Night sleep" card, each in the same framed preview style with a caption. (3) **Import** (`Import.dc.html`): title "Import data"; the drop zone reads "Choose a file · babble export (.json) or Huckleberry export (.csv)". For a babble export, hide the timezone picker and, when the file holds several babies, show a "Baby in the file" select next to "Import into". The Settings row becomes "Import data · From a babble export or a Huckleberry CSV". Light and dark, phone and desktop.

---

## 2026-10-13 · Chair mode behind Plus, with a preview

Paste everything below this line into Claude Design.

> (1) **Settings → This device** (`Phone Account.dc.html`, `Web.dc.html`): replace the "Open chair mode" row with a Chair mode card: `tablet` in a `feed-left-soft` circle, "Chair mode" title with the Plus badge on the right (billing on), one `ink-2` line ("A full-screen feed station for a tablet or touchscreen by the feeding chair, with giant buttons. It keeps the screen on and dims overnight."), then two secondary buttons: "Preview" (`eye`) and "Open chair mode" (`tablet`; for a free family it's muted with `lock` and opens the Plus sheet). (2) **Chair mode preview** dialog: a wide centred sheet (bottom sheet on phone) titled "Chair mode preview" with a short line and a round close button, showing the two framed example screens from the welcome page side by side (stacked on phone) with captions "Between feeds…" and "During a feed…". (3) **/chair without Plus**: a plain page with "← Back to Settings", the Patterns-style Plus card ("Chair mode … part of Babble Plus. Here's what it looks like." + "See what Plus adds"), and the two preview screens below. (4) Welcome page: the Chair mode tile and the "A feed station by the chair" heading get the Plus badge when billing is on, and "Chair mode, a feed station for a tablet by the feeding chair" joins the Plus checklist.

