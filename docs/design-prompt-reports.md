# Claude Design prompt: Reports

Paste everything below this line into Claude Design (the Babble project).

---

> Add **Reports** to the **babble design system v1 ("Sage")**, on phone (390 px) and desktop (1280 px), light and dark. Use the existing tokens, components and patterns exactly: colours, Figtree type scale, radii, spacing, Lucide icons at stroke 2.75, segmented control, chips, bottom sheets, dialogs, the stats card frame (title, figures row in `surface` tiles, chart, caption in `ink-3`), the tracker colours (`sleep`, `feed-left`, `feed-right`, `downtime`, `bottle`, `nappy`, `pump`, `growth`, `custom`) and the person colours (`person-1`…`person-4`). **Don't change any tokens.** Put it in a new `Reports.dc.html` with `screen`, `size` and `theme` props, and add the new chart types to the component sheet in `Babble Design System.dc.html`.
>
> ## What it is
>
> Stats shows the charts we chose. Reports lets a family build their own: pick what to measure (time asleep, bottle ml, nappies, feeds by hour, who logged what…), over what range, split by what (sleep location, bottle content, carer, poo colour…), choose a chart, see it update live, and save it with a name. Saved reports are shared with every carer in the family. A free family can save **2 reports**; Plus families save as many as they like. Later, saved reports and the existing stats cards go on a shared **dashboard**.
>
> Keep the tone of the rest of the app: calm, glanceable, one-handed on the phone. It's a baby tracker, not a BI tool. Menus and chips, not formulas.
>
> ## Chart types (design each one in the stats card frame, light and dark)
>
> 1. **Bar**, single and stacked (we have this: keep it).
> 2. **Line**: one to four series, an optional dashed 7-day average, hollow points on hover or tap, a readout popover.
> 3. **Area**: stacked, soft tints with a solid top line per series (night sleep in `sleep`, naps in `sleep-soft`).
> 4. **Donut**: up to eight slices, the total in the middle in the display size, a legend with values beside it on desktop and below on phone.
> 5. **Number**: one big figure in tabular numerals, the change on the previous period as a small chip (up in `success-soft`, down in `caution-soft`, neutral in `surface`), and a tiny sparkline.
> 6. **Table**: buckets down, series across, totals row, tabular figures, with "Export CSV" in the card menu.
> 7. **Heatmap**: days as rows, 24 hours across, cells tinted from `surface` up to the tracker colour, hour labels at 0, 6, 12, 18, the night window shaded faintly behind. This is the chart parents screenshot, so give it room.
> 8. **Histogram**: a distribution of durations or amounts (nap lengths in 15-minute bins), the median marked with a dashed line and a label.
> 9. **Rhythm**: one row per day with coloured blocks for sleep, feeds and pumps (the Timeline's day view laid flat), 14 rows on desktop and 7 on phone with a scroll.
>
> Every chart keeps the readout pattern from the stats cards: hovering or tapping a bar, point, slice or cell shows a popover with the bucket and values, and the whole chart has an empty state ("Nothing logged in this range yet") and a loading state at 60% opacity.
>
> ## Screens
>
> **`reports-list`:** the Reports page. Header "Reports" with a primary "New report" button. A "Start from" row of template chips with small icons (Night and naps, When Olivia sleeps, When feeds happen, Where Olivia sleeps, Feeds per day, Bottle intake, Nap lengths, Wake windows, Nappy output, Who logs what, Weight gain, Last 14 days). Below, "Saved" as a grid of report cards (2 columns on desktop, 1 on phone), each showing the live chart at a small size, its name, its range and split as meta ink-2 ("30 days · by location"), and who made it as a person-coloured avatar. A free family sees "2 of 2 saved" in the heading's meta line. Empty state: Lucide `chart-spline`, "No reports yet", "Start from a template or build your own."
>
> **`report-view`:** one report open. Title, the meta line, a card menu (Edit, Rename, Duplicate, Export CSV, Delete) and a range segmented control (7d · 14d · 30d · 90d · 6m · All, with "All" carrying the Plus badge for a free family). The chart in the card frame at full width, the figures row above it, and under the chart a "Compare with the previous 30 days" switch that adds the earlier period as a faded series. Show it with the **heatmap** (feeds by hour) on desktop and the **line** (bottle intake with 7-day average) on phone.
>
> **`report-builder`** (desktop): a two-column layout, the live preview on the right in the card frame, the settings panel on the left (320 px) in sections:
>
> - **Measure**: a list of chips grouped by tracker (Sleep · Feeds · Nappies · Pump · Solids · Growth · Custom · Logging), multi-select up to 4, each chip in its tracker colour when selected. A search field at the top of the panel filters them.
> - **Range**: the segmented control plus a "Custom…" chip that opens a date range picker.
> - **Group by**: Day · Week · Month · Hour of day · Weekday.
> - **Split by**: a single-select chip row that depends on the measure (for sleep: Location, Fall asleep, Mood, Night or day, Carer, Device, Weekday), with "None" first.
> - **Chart**: icon tiles for the nine types, with the ones that don't fit the current settings dimmed and a hint when hovered ("Donut needs a split"). The suggested one is pre-selected and marked "Suggested".
> - **Filters**: "Add filter" opens a popover with the same keys as Split by plus "Notes contain"; added filters show as removable chips ("Location is Pram").
> - **Options**: switches for "7-day average", "Cumulative", "Show empty days", "Stack".
>
> The preview updates as settings change and shows the suggested name as a placeholder title ("Time asleep by location, 30 days"). A sticky footer has "Save" (primary) and "Cancel".
>
> **`report-builder-phone`:** the preview at the top, then a stepper of sections as a bottom sheet with tabs (Measure · Range · Split · Chart · More), one section visible at a time, the sheet at half height so the chart stays visible above it. Save and Cancel in the sheet's footer.
>
> **`report-save`:** the save dialog (desktop) and sheet (phone): a name field pre-filled with the suggested name, "Shared with your family" as meta ink-2, and Save.
>
> **`report-limit`:** the same dialog for a free family that already has 2 saved reports: a `caution-soft` panel "You've saved 2 reports. Babble Plus saves as many as you like." with a "See Plus" primary button, and below it "Or replace one" with the two existing reports as selectable rows and a secondary "Replace" button.
>
> **`report-templates`:** the "Start from" sheet listing the twelve templates as rows with a tiny chart thumbnail, name, and a one-line description ("Feeds by hour of day across the last 30 days").
>
> **`dashboard`** (future, one screen each size): Stats with the dashboard at the top: a grid of cards, prebuilt (Sleep, Feeds, Nappies, Growth) and custom (two saved reports), at sizes S (1 column) and M (2 columns), an "Add card" dashed tile at the end, and an "Arrange" mode where cards show a drag handle and a size toggle. Include a small text card ("Started formula top-ups 12 Oct") between charts. The Patterns section stays below as it is.
>
> ## Entry points (small updates to existing screens)
>
> - **Stats:** a quiet "Reports" link row with Lucide `chart-spline` and a chevron under the range picker, and "Open in Reports" in each stats card's menu so a prebuilt card becomes the starting point of a custom one.
> - **Desktop sidebar:** "Reports" under Stats.
> - **Settings → Plus:** add "Unlimited saved reports" to the highlights list.
>
> ## Deliverables
>
> - All screens above in light and dark at 390 px and 1280 px.
> - The nine chart types on the component sheet, each with its readout popover, empty and loading states.
> - A note on how the builder's settings panel folds into the phone sheet, and which chart types need the most width (the heatmap and the rhythm chart).
