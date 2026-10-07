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
> - **Feeds:** Per day 8.6 · Average gap 2h 26m · Left / right 53% / 47% · Downtime per feed 1m · Bottle per day — (dash when none). Chart: Breast (feed-right) under Bottle (bottle).
> - **Nappies:** Wet per day 4.7 · Dirty per day 4. Chart: Wet (nappy at 45%) under Dirty (nappy). Below the chart, "Recent poo colours, newest first" and a wrapping row of 20px poo swatches.
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
