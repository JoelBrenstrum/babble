# Claude Design prompt: TOG calculator (public page)

Paste everything below this line into Claude Design (the Babble project).

---

> Add a **public TOG calculator page** to the **babble design system v1 ("Sage")**, in the same style as the landing page (`/welcome`): no sign-in needed, the wordmark header with "Sign in", generous hero spacing, framed previews, the surface-coloured panels and the footer. Use the existing tokens, components and patterns exactly: colours, Figtree type scale, radii, spacing, Lucide icons at stroke 2.75, segmented control, chips, stepper (tap the number for a keypad, as on the bottle form), rounded cards and meta ink-2 / ink-3 hints. **Don't change any tokens.** Tint with `sleep` / `sleep-soft` / `on-sleep`, since this belongs with sleep. Light and dark, at 390 px and 1280 px. Put it in a new `Web Tools.dc.html` with `screen` and `size` props.
>
> ## What it is
>
> A TOG is the warmth rating of baby sleepwear and sleeping bags (0.2 is a thin summer bag, 3.5 is a thick winter one). Parents use a chart that maps room temperature to a bag TOG. This page is that chart as a calculator that works **in both directions**:
>
> 1. **Room temperature → TOG.** Enter the room temperature and get the TOG to use, the range to consider, and what to wear under the bag.
> 2. **TOG → room temperature.** Enter the TOG of the bag you own and get the room temperature range it suits, and what to do when the room is outside it.
>
> It is a shareable, search-friendly page that also introduces babble, so it ends with a soft call to action rather than being hidden behind sign-in.
>
> ## The chart behind it (use these exact numbers)
>
> | Room temperature | TOG | Under the bag |
> |---|---|---|
> | 24 °C and above (75 °F+) | 0.2 | Short-sleeve bodysuit, or just a nappy when it's very warm |
> | 20–24 °C (68–75 °F) | 1.0 | Short-sleeve bodysuit; long sleeves at the cool end |
> | 18–24 °C (64–75 °F) | 1.5 | Long-sleeve bodysuit (an "all season" bag that overlaps the two bands either side) |
> | 16–20 °C (61–68 °F) | 2.5 | Long-sleeve bodysuit, or a sleepsuit |
> | Below 16 °C (below 61 °F) | 3.5 | Long-sleeve bodysuit and a sleepsuit |
>
> The 1.5 TOG row only matters in Bag TOG mode. In Room temp mode the scale uses the four main bands, and a result inside 18–24 °C adds a hint: "A 1.5 TOG all-season bag also covers this."
>
> Rules for the results:
>
> - **Temperature → TOG:** the headline is the TOG for the band the temperature falls in. Within 1 °C of a band edge, the headline becomes a range across both bands ("1.0–2.5 TOG") with a hint: "20 °C sits between two bands. Go 2.5 if the room cools overnight." The layers line follows the heavier band in that case.
> - **TOG → temperature:** the headline is the band's range ("16–20 °C"). TOGs not on the chart (0.5, 2.0, 3.0) show an interpolated range and the hint "Brands rate in-between bags differently. Check the label's own guide." Above 3.5 clamps to the 3.5 band.
> - A **°C / °F** toggle sits next to the temperature input (small segmented control). °C is the default. The other unit always shows in a meta ink-3 line under the result.
> - Both directions end with the same safety lines in meta ink-2: "Check the back of the neck or the chest, not hands or feet. Warm and dry is right." and "A sleeping bag goes on its own: no blankets, duvets or hats indoors." The layers are a suggestion, so each result also carries "Layers vary by brand. Follow the bag's own guide." in ink-3.
>
> ## Page structure (top to bottom)
>
> 1. **Header:** the wordmark and "Sign in", as on `/welcome`.
> 2. **Hero:** "What TOG tonight?" (34 px, 48 px on desktop), subline "Enter the room temperature to get the right sleeping bag, or enter your bag's TOG to see the room temperature it suits." No buttons; the calculator is right below.
> 3. **The calculator card** (`raised`, 1 px `line` border, max 560 px, centred, with a soft `shadow-raised`):
>    - A segmented control at the top: **Room temp** · **Bag TOG**.
>    - **Room temp mode:** a large stepper ("19.0 °C" in tabular figures, ±0.5, tap the number for the keypad, 10 to 35 °C), the °C / °F toggle beside it. Result below: a big TOG value ("2.5 TOG", display size), a body line "Suits 16–20 °C", a **layers row** with two small tinted icon tiles (Lucide `shirt` and `baby`, `sleep-soft` with `on-sleep`) and "Long-sleeve bodysuit, or a sleepsuit", then the safety lines.
>    - **Bag TOG mode:** a single-select chip row **0.2 · 0.5 · 1.0 · 1.5 · 2.0 · 2.5 · 3.5**, the selected chip with a check, and a ghost "Other…" chip for any value via the keypad (one decimal, 0.1 to 5.0). Result: a big temperature range ("16–20 °C"), the other unit in meta ink-3 ("61–68 °F"), the layers row, then two **outside-the-range** rows with Lucide `thermometer-sun` and `thermometer-snowflake`: "Warmer than 20 °C: swap to 1.0 TOG" and "Colder than 16 °C: add a sleepsuit, or move to 3.5 TOG", then the safety lines.
>    - Under either result, a horizontal **band scale**: four segments proportional to the chart (treat the open ends as 12–16 and 24–28), TOG above each segment, °C edges below (°F under those on desktop), the active band filled `sleep`, the others `sleep-soft`, a small ink marker at the entered temperature, and a `sleep-soft` chip over the 16–20 band reading "ideal nursery range".
> 4. **"The chart"**: the four-row table above as a readable table (temperature · TOG · under the bag), the whole thing in a surface-coloured panel, so people who just want the chart can screenshot it.
> 5. **"What a TOG is"**: three short cards with tracker-tinted icon tiles, in the "What babble does" grid style:
>    - **A unit of warmth.** "TOG stands for thermal overall grade. One tog is 0.1 m²·K/W of thermal resistance, defined by the Shirley Institute in Manchester in 1946."
>    - **Bags and duvets.** "Baby bags run from 0.2 to 3.5 TOG. Adult duvets start at about 3 TOG for summer and go past 13 for winter, which is why a duvet is never right for a baby."
>    - **Room, not weather.** "Pick the TOG from the room the baby sleeps in, not the forecast. A thermometer in the nursery makes this easy."
> 6. **"Safe sleep basics"**: a surface panel with four short points, like the "Private and open source" panel on `/welcome`: check the neck or chest; the neck opening must not let the head slip inside; move to arms-out once the baby rolls; when the feet reach the bottom of the bag it is time for the next size. Below the points, two small side-by-side cards, "Too warm" (`caution-soft`: red cheeks, sweating, fast breathing) and "Too cold" (`info-soft`: cool chest or tummy, frequent waking, waking early between 3 and 5 am).
> 7. **Soft call to action**: a framed, faded preview of the Home screen with a running nap card next to "babble tracks sleep, feeds and nappies, shared live with everyone who helps." and a primary "Get started" plus secondary "See what babble does" (to `/welcome`).
> 8. **Footer:** wordmark and Sign in · Privacy · Terms · GitHub, as on `/welcome`.
>
> ## Screens to show
>
> - `tog-temp`: Room temp mode at 19.0 °C (the default), full page.
> - `tog-temp-edge`: the calculator card only, at 20.0 °C with the "1.0–2.5 TOG" range headline and the between-bands hint.
> - `tog-temp-hot`: card only, at 26.0 °C, "0.2 TOG", plus a `caution-soft` / `on-caution` line "Above 26 °C a bag is optional. A nappy and a thin bodysuit may be enough."
> - `tog-temp-cold`: card only, at 13.0 °C, "3.5 TOG", plus a `caution-soft` line "Below 14 °C, add a layer and warm the room if you can."
> - `tog-temp-f`: card only, with °F selected ("66.0 °F").
> - `tog-bag`: Bag TOG mode with 2.5 selected, full page.
> - `tog-bag-15`: card only, 1.5 TOG selected, with "18–24 °C" and the hint "An all-season bag. Add a layer at the cool end and go short sleeves at the warm end."
> - `tog-bag-custom`: card only, 2.0 TOG via Other, with the interpolated range ("17–22 °C") and the brands hint.
> - `tog-keypad`: the keypad bottom sheet (phone) and popover (desktop) for the temperature, matching the bottle keypad, with the unit label and a Done button.
> - `tog-first`: card only, before anything is entered: the stepper reads "— °C" and the result area is an empty state with Lucide `thermometer`, "Enter the room temperature", "We'll suggest a sleeping bag TOG and what to wear under it."
>
> ## Entry points (small updates to existing screens)
>
> - **`/welcome`:** add "TOG calculator" to the footer links, and a 14th card in the "What babble does" grid: `thermometer` tile, "TOG calculator", "Room temperature in, sleeping bag TOG out. Works without an account."
> - **Sleep start screen (`Phone Forms.dc.html` sleep):** a quiet link row under the location chips, Lucide `thermometer` in `sleep`, "What should Olivia wear tonight?" with a chevron, opening the public page.
>
> ## Deliverables
>
> - The full page in light and dark at 390 px and 1280 px, plus the card-only states above.
> - The band scale and the layers row added to the component sheet in `Babble Design System.dc.html`.
> - A note on how the calculator card scales between the two widths (the band scale labels are the tight part on phones).
