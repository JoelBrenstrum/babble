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
