# Pending design changes

UI changes made in code that the Claude Design project doesn't have yet. Paste a section into Claude Design (the Babble project), apply it, re-export, and sync the export into `docs/design/`. Delete a section once it's synced.

---

## 2026-10-08 · Timeline 7d and solid poo

Paste everything below this line into Claude Design.

> Two small changes in the Sage screens:
>
> **1. Week becomes 7d.** On the Timeline (`Screen.dc.html` `week`, `Web.dc.html` `history-week`), the segmented control reads **Day | 7d**. The view shows the last 7 days ending today (or ending on the chosen day), not Monday to Sunday, so today is always the right-most column (primary outline and label) and no days are faded as future. The range label stays "2 – 8 Oct" / "28 Sep – 4 Oct"; the arrows move back or forward 7 days and › is disabled when the range ends today. The daily totals table follows the same 7 columns.
>
> **2. Poo texture "Hard" is now "Solid".** In the nappy form texture chips (`Phone Forms.dc.html`, `Screen.dc.html` `nappy`, and the web add dialog), rename the "Hard" chip to "Solid". The chips are now Runny, Seedy, Pasty, Formed, Mucousy, Solid.

---

## 2026-10-08 · Stats (new screen)

Paste everything below this line into Claude Design.

> Add a **Stats** screen to the Sage screens: phone (`Screen.dc.html`, new `stats` option, Stats tab selected) and desktop web (`Web.dc.html`, new `stats` option, Stats selected in the sidebar). Light and dark. No new colours.
>
> - **Header:** "Stats" title; under it a meta line "Daily averages over 9 finished days; today is charted but not averaged." (variant: "Showing today so far. Daily averages start once a full day has been logged."). A segmented control **7d | 30d | All**: on the right of the title on desktop, full width under the title on phones.
> - **Cards:** one per tracker in a 2-column grid on desktop and stacked on phones: Sleep, Feeds, Nappies, and Pump only when there was pumping. Each card has:
>   - a header with the tracker's round soft icon tile and name;
>   - figure tiles (surface background, caption label, semibold value) in 3 columns on desktop and 2 on phones;
>   - a chart: a legend row with small rounded squares on the left and "max 15h" (or "weekly avg, max 7.4h") in caption ink-3 on the right; then a 128px-tall stacked bar chart, one bar per day with 3px gaps, rounded tops and a hairline baseline; then the first and last dates ("28 Sep", "7 Oct") under the corners. Hovering a bar on web shows "7 Oct: Night 5h, Naps 4.5h".
> - **Sleep:** Per day 10h 27m · Night 5h 30m · Naps per day 3.4 · Longest stretch 5h 22m · Wake window 1h 32m. Chart: Night (sleep) under Naps (sleep at 45%).
> - **Feeds:** Per day 8.6 · Average gap 2h 26m · Left / right 53% / 47% · Downtime per feed 1m · Bottle per day — (dash when none). Chart: Bottle (bottle) at the bottom with Breast (feed-right) on top. Only the topmost non-empty segment of each bar gets the rounded top.
> - **Nappies:** Wet per day 4.7 · Dirty per day 4. Chart: three stacks, bottom to top: Wet only (nappy at 35%), Both wet and dirty (nappy at 65%), Dirty only (nappy); legend "Wet · Both · Dirty". Below the chart, "Recent poo colours, newest first" and a wrapping row of 20px poo swatches.
> - **Pump:** Per day 210 ml · Sessions per day 2 · Left / right 105 ml / 105 ml. Chart: one pump-coloured series.
> - **Empty state:** the chart-column icon tile, "Nothing to chart yet", "Stats for sleep, feeds and nappies appear once you start logging."

---

## 2026-10-08 · Baby sex and growth percentiles

Paste everything below this line into Claude Design.

> **1. Sex on the baby.** In the Add baby form (`Phone Account.dc.html` onboarding and "Add a baby") and Settings → Baby, add a field after Birth date: label "Sex", a three-option segmented control **Girl | Boy | Not set** (Not set selected by default when adding), hint "Used to compare growth with the WHO growth charts."
>
> **2. Growth card on Stats**, below the tracker cards, full width on desktop (three charts side by side) and stacked on phones:
> - Header: the growth icon tile (Lucide `ruler`, growth-soft), "Growth", and a "Log growth" text link in primary on the right.
> - One chart each for Weight, Length and Head. Above each chart, the label on the left; on the right the latest value in bold ("4.30 kg"), "51st percentile" in caption ink-2, and the date ("26 Oct") in caption ink-3.
> - The chart: age in months along the bottom (0, 1, 2…; "months" at the end), the value on the left with the unit ("kg", "cm") above the axis, and hairline gridlines. WHO percentile curves: 50th in growth at 60%, 15th and 85th in ink-3 at 35%, 3rd and 97th dashed in ink-3 at 50%. The baby's measurements are growth-coloured dots (with a raised-colour ring) joined by a 2px growth line.
> - Footnote in caption ink-3: "Lines show the WHO 3rd, 15th, 50th, 85th and 97th percentiles, up to 2 years."
> - Without a sex: an info status "Set Olivia's sex in Settings to compare with the WHO growth charts." (Settings is a link), the measurements charted without curves, and no percentile text.
> - With no growth entries: "No growth entries yet. Log a weight, length or head size to chart it."

---

## 2026-10-08 · Summary strip on each list

Paste everything below this line into Claude Design.

> On every category list (`Screen.dc.html` list states and the web tracker lists, light and dark), add a **summary strip** between the header/filter and the first day group. It uses the same look as the Today strip on Home: surface background, card radius, three equal columns split by hairline dividers. Each column has a meta ink-2 label, a bold heading value, and a caption ink-3 note under it. The whole strip is tappable and opens Stats. It must fit three columns on a 375px phone, so values stay short.
>
> - **Feeds:** Last feed `1h 20m` / "ago · 2:15 pm" · Today `6` / "avg 8" · Next side `Left`. While a feed is running, the first column reads Feeding for `12m` / "since 2:15 pm".
> - **Bottle filter:** Last bottle `2h 05m` / "ago · 1:30 pm" · Today `360 ml` / "avg 420 ml" · Per bottle `90 ml`.
> - **Sleep:** Awake for `1h 05m` / "ago · 2:30 pm" (Asleep for `45m` / "since 2:50 pm" while sleeping) · Today `9h 40m` / "avg 11h 05m" · Naps `3` / "avg 3.4".
> - **Nappies:** Last change `45m` / "ago · 3:00 pm" · Wet today `4` / "avg 5" · Dirty today `2` followed by a 16px swatch of the latest poo colour, / "avg 3".
> - **Pump:** Last pump `3h 10m` / "ago · 12:20 pm" · Today `210 ml` / "avg 180 ml" · Left / right `110 / 100` / "ml today".
> - **Growth:** Weight `4.30 kg` / "51st percentile" · Change `+180 g` / "in 6 days" · Length `55 cm` / "48th percentile".
> - **Custom:** Last `2h 00m` / "ago · 1:40 pm" · Today `3` · 7 days `14`.
>
> Hide the strip when the list is empty (the empty state shows instead). Use "—" for a figure with nothing to show.

---

## 2026-10-08 · Confirm account from a sign-in link

Paste everything below this line into Claude Design.

> Add a **"Continue as…"** state to the auth callback (`Web Auth.dc.html`, and `Phone Account.dc.html` for consistency), light and dark. It uses the centered auth page layout. It appears when someone opens a sign-in or password-reset link sent from the Supabase dashboard, before the link signs them in.
>
> - Title: "Continue as jane@example.com?"
> - Body in ink-2: "Only continue if you asked for this sign-in link." When someone else is already signed in on this device, the body instead reads "You're signed in as john@example.com. This link signs you in as jane@example.com instead."
> - A full-width primary **Continue** button, and under it a centred "Cancel" text link in primary that goes back to sign in.
>
> Also, the "Couldn't sign you in" error state now shows fixed wording: "This sign-in link has expired. Ask for a new one.", "This sign-in link isn't valid any more. Ask for a new one." or "This sign-in link didn't work. Try signing in again."
>
> Invite codes are now 10 characters, shown as `K7Q4M-D2XPA`. Update the invite code in the invite panel, the onboarding invite step and the invite-code field placeholder.

---

## 2026-10-08 · Next side on the breastfeed start screen

Paste everything below this line into Claude Design.

> On the breastfeed start screen (`Screen.dc.html` feed start, and the web new-feed page), the side the parent should start on gets a small **"Next"** pill in the top-right corner of its big L / R button: raised background, ink text, caption bold, fully rounded. It's the opposite of the side the last feed ended on. Show it on one side only, and on neither when there's no previous breastfeed. Both buttons stay the same size and colour, so either side is still one tap.

---

## 2026-10-08 · End feed? sheet when a nap starts

Paste everything below this line into Claude Design.

> Add an **"End Olivia's feed?"** bottom sheet (`Screen.dc.html`, next to the existing "End Olivia's nap?" and "Is Olivia asleep?" sheets; a centred dialog on web). Light and dark. It appears when someone starts a nap while a breastfeed is running.
>
> - Header: the round feed-right-soft tile with the Lucide `heart` icon in on-feed-right, then the title "End Olivia's feed?".
> - Body in ink-2: "A feed has been running since 2:15 pm."
> - Buttons: primary **End feed** (or "End feed at nap start (2:40 pm)" when the nap was backdated), then ghost **Keep feeding**.

---

## 2026-10-08 · Details while a nap is running

Paste everything below this line into Claude Design.

> On the running sleep timer (`Screen.dc.html` sleep timer and `Phone Forms.dc.html` `sleep`; the web session page), add a **Details** section under the Napping card. It has a section label "DETAILS" and a card containing:
>
> - A meta line in ink-2: "Saved as you go, without stopping the timer."
> - The sleep detail fields from the sleep form, in the same order and style: Where (location chips), Fell asleep in (single-choice chips), Mood going down, Mood on waking, the "Woken by a carer" check row, and a "Notes (optional)" text area.
>
> There's no Save button, since every change saves immediately. Show a selected state for Cot in the mock and a short note such as "Went down easily".

---

## 2026-10-08 · Export data in Settings

Paste everything below this line into Claude Design.

> In Settings (`Screen.dc.html` settings, `Web.dc.html` settings), the **Data** section gets an **Export data** card under "Import from Huckleberry" (on phones the Data section is new and holds just this card). Light and dark.
>
> - Title "Export data" (row-title, semibold), and under it in meta ink-2: "Download everything as a JSON file: profile, settings and every entry, including deleted ones."
> - A secondary button with the Lucide `download` icon: "Export Olivia". When the family has more than one baby, a second secondary button: "Export whole family". Buttons sit side by side on web and stacked full width on phones.
> - While exporting, the pressed button shows its spinner and the other is disabled. Errors show as a danger status under the buttons.

---

## 2026-10-08 · Nappy form starts with no type

Paste everything below this line into Claude Design.

> In the nappy form (`Phone Forms.dc.html` `nappy`, `Web.dc.html` log nappy), the **Type** segmented control (Wet / Dirty / Both / Dry) starts with nothing selected: all four segments show the unselected style, and no wee or poo detail fields are shown yet. The **Save** button is disabled (45% opacity) until a type is picked. Show both states: the fresh form, and the form after tapping Wet (Wet selected, the "Wee size" selector shown, Save enabled). Light and dark.

---

## 2026-10-08 · Brand name in lower case

Paste everything below this line into Claude Design.

> Write the product name as **"babble"**, all lower case, everywhere it appears as text, to match the lower-case "b" logo. That includes the wordmark in the app header, the sign-in and onboarding screens, loading spinners, the browser tab title, the PWA and app icon names, share text ("Join our family on babble"), and copy such as "already in babble" and "babble isn't configured yet". Keep it lower case even at the start of a sentence. Update the design system's wordmark and every screen that shows the name, in light and dark.

---

## 2026-10-08 · Previous growth values as placeholders

Paste everything below this line into Claude Design.

> In the growth form (`Phone Forms.dc.html` `growth`, `Web.dc.html` log growth), each empty measurement field shows the last recorded value as its placeholder in ink-3: Weight "Last: 4.8 kg · 3 Oct", Length "Last: 54 cm · 20 Sept", Head circumference "Last: 37.2 cm · 20 Sept". Fields with nothing recorded before stay blank. Show one mock where weight has been typed (so its placeholder is gone) and the other two still show their placeholders. Light and dark.

---

## 2026-10-08 · Ended earlier? and who ended it

Paste everything below this line into Claude Design.

> On every running card (`Screen.dc.html` timer and sleep timer, the Home running cards, and the web session page), add a small centred text button **"Ended earlier?"** in meta ink-2 under End nap / Finish. Tapping it replaces the button with a panel matching the "Started earlier?" panel (raised tile, shadow-raised):
>
> - Title "Ended earlier?" (body, semibold).
> - Chips: "5 min ago", "10 min ago", "15 min ago", "30 min ago". Chips that would end before the nap or current side started are disabled at 45% opacity.
> - An "End time" date-time field, with an inline danger error such as "The end can't be before the nap started."
> - Buttons: secondary **Cancel** and primary **End nap at 2:25 pm** (or "End feed at…", "End pump at…").
>
> On the entry detail page (`Phone Forms.dc.html` edit screens, `Web.dc.html` entry edit), the author line under the title becomes two meta ink-2 lines for timed entries: "Started by Jane · 6 Oct, 2:02 pm" (with Jane's avatar), then "Ended by John at 2:32 pm". Entries logged after the fact keep the single "Logged by…" line. Light and dark.

---

## 2026-10-08 · Left, right and idle feed time

Paste everything below this line into Claude Design.

> Split breastfeed time by side everywhere it's drawn or totalled (`Screen.dc.html` `day` and `week`, `Web.dc.html` timeline and stats). Light and dark.
>
> - **Day timeline:** each breastfeed block draws its sides in `feed-left` and `feed-right`. The gaps between sides (idle) are a 1px dashed `session-downtime` outline with no fill, instead of a soft fill.
> - **7-day view:** breastfeeds draw each side as a short bar in its side's colour instead of one `feed-right` tick. Bottles stay as `bottle` ticks.
> - **Day totals, Feeds card:** four detail tiles, Left / Right / Idle / Bottle, in a 2×2 grid on phones and four across on wider screens.
> - **Daily totals table (7-day):** the "Breast time" row becomes three rows, Left (feed-left dot), Right (feed-right dot) and Idle (dashed session-downtime outline dot).
> - **Stats, Feeds card:** a new figure tile, "Breast per day", with a value like "L 42m · R 38m · idle 9m".

---

## 2026-10-08 · Pause and resume a nap

Paste everything below this line into Claude Design.

> On the running sleep card (`Screen.dc.html` sleep timer, Home running card, web session page), replace the single full-width End nap button with two side by side: secondary **Pause nap** (Lucide `pause`) and the sleep-coloured primary **End nap** (Lucide `moon`). Light and dark. Show three states:
>
> - **Running, never paused:** title "Napping", big timer of time asleep.
> - **Paused:** title "Awake · nap paused"; the timer stops at the time asleep, and beside it in meta ink-2 "awake 3m · 1 wake-up" (the awake time keeps ticking). The left button reads **Resume nap** (Lucide `play`).
> - **Resumed:** title "Napping" again, the timer counting asleep time, with "awake 12m · 2 wake-ups" beside it.
>
> In lists (`Phone Lists.dc.html` `sleep`), a paused-and-resumed nap row shows its asleep time on the right and two chips: "2 wake-ups" (sleep-soft) and "awake 12m" (session-downtime-soft with the small pause icon). On the day timeline, such a nap draws its asleep stretches as solid `sleep` blocks inside a 1px dashed `sleep` outline, so the awake gaps read as empty dashed space.

---

## 2026-10-08 · Home tab shows when something is running

Paste everything below this line into Claude Design.

> When any timer is running (nap, breastfeed, pump or a timed custom entry), the **Home** nav item gets a small 10px dot badge at the top right of its icon, in the running tracker's colour (`sleep`, `feed-right`, `pump`, `custom`) with a 2px `raised` ring. It pulses gently, like the live dot on the running card, and stops pulsing (staying solid) when everything running is paused. If two different trackers are running, the dot is split down the middle into both colours. Show it on the phone bottom tab bar (`Screen.dc.html` tab bar, on the Timeline, Stats and Settings tabs), the tablet icon rail and the desktop sidebar (`Web.dc.html`); in the full sidebar it sits at the right end of the Home row. Light and dark.

---

## 2026-10-08 · Clustered timeline markers stay in their lane

Paste everything below this line into Claude Design.

> On the day timeline (`Screen.dc.html` `day`, `Web.dc.html` timeline), when nappies or bottles are logged close together, each later marker is nudged right by 30% of the lane (at most 60%) and shrinks to fit, truncating its label with an ellipsis, so markers never spill past the lane or off the edge of a phone screen. Show three nappies logged within a few minutes on a 390px phone. Light and dark.
