# Claude Design prompt: babble UI theme

Create a design system and UI theme for **babble**, a baby tracking app for logging sleep, breastfeeds, bottles, nappies, pumping, growth and custom events. Think of it as a calmer, more detailed take on Huckleberry. It is a single Expo (React Native) codebase that also runs on the web, styled with NativeWind (Tailwind), so every token must map cleanly to a Tailwind theme.

## Who uses it and when

- Sleep-deprived parents, often at 3am, holding a baby in one arm. The phone is in the other hand, and the room is dark.
- Mostly quick glances and single taps: start or stop a timer, switch breast side, log a nappy.
- Two caregivers share one baby, so live timers started by a partner must be obvious.

## Design principles

1. **Night first.** Dark mode is the default at night and must be the most polished theme. Avoid bright whites and saturated blue light. Use warm, low-luminance surfaces and text that doesn't glare.
2. **One-handed and forgiving.** Touch targets of at least 48pt, primary actions within thumb reach at the bottom of the screen, generous spacing, and no tiny icon-only controls for important actions.
3. **Calm, warm and trustworthy.** Soft and friendly, but not childish. No cartoon clutter. It should feel closer to a well-made health app than a toy.
4. **Glanceable numbers.** Timers and durations ("10m 32s", "last 2h 14m ago") are the hero content. Use a typeface with tabular figures so running timers don't jitter.
5. **Accessible.** WCAG AA contrast in both themes. Never use colour alone to carry meaning; pair it with an icon or label.

## Token set to produce (light and dark for each)

- **Neutrals:** background, surface, raised surface (cards, sheets), border, text primary, secondary and muted.
- **Brand:** primary, plus a secondary accent.
- **Tracker category colours**, distinct from each other and readable in both themes, each with a solid, a soft tint for backgrounds, and an on-colour for text. Each one is also used for that event's blocks in the history timelines:
  - Sleep
  - Breast feed: **Left** and **Right** sides need two related but clearly distinguishable shades
  - Bottle
  - Nappy
  - Pump
  - Growth
  - Custom
- **Feed session states:** active segment (running), paused, and **downtime** (lost time between segments; it should read as neutral or "idle", not as an error).
- **Status:** success, warning ("feed overdue"), danger (destructive actions), info ("next feed due in 42m"), and a gentle **medical caution** style for the "check with your provider" note on red, black or white poo. It should be noticeable but not alarming.
- **Poo colour swatches:** yellow, mustard, green, dark green, brown, orange, black, red, white/grey. These must stay **literal and realistic** in both themes, since parents compare them to a real nappy. Keep them separate from the theme palette, and give each swatch a border so black and white stay visible on any surface. Show how a two-colour selection renders as a split swatch.
- **Typography:** a type scale including an extra-large timer style (tabular numerals), section headings, list row title and meta text, and chip/label text.
- **Spacing, radius, elevation and motion:** a 4/8-based spacing scale, corner radii for cards, sheets, chips and buttons, a subtle shadow or elevation for each theme, and a slow pulse for running-timer indicators. Respect reduced motion.

## Components to design

Primary, secondary and destructive buttons · large L/R side-toggle buttons for the feed timer · running-timer card (shows who started it) · home tracker row ("Feed · last 2h 14m ago (R)" with a + button on the right) · chips and multi-select chips · segmented control · stepper (+/-10 ml) · colour swatch picker (max 2) · size selector (tiny, little, medium, large, massive) · bottom sheet (used for "End nap?" / "Start nap?" prompts) · undo toast · list row with swipe-to-delete · day group header with totals · bottom tab bar (Home, History, Stats, Settings) · empty states.

## Screens to mock (both themes, phone width)

1. **Home dashboard:** baby name and age, "Next feed due" banner, a running feed timer card at the top, one row per tracker, and a today summary strip (sleep, feeds, nappies).
2. **Breast feed timer:** big LEFT and RIGHT buttons with the active side's live timer, a Pause button, and a session list underneath:
   ```
   Left       10m 32s
   Downtime    3m 02s
   Right      12m 23s
   Total feeding 22m 55s · lost 3m 02s
   ```
3. **Nappy form:** Wet / Dirty / Both / Dry, poo colour swatches (two selected, shown as a split), size chips and texture chips.
4. **Category list (Feeds):** rows grouped by day, e.g. `14:02 · L 10m · R 12m · ⏸ 7m`, with day totals in the headers.
5. **Daily history:** a vertical 24h timeline with coloured sleep and feed blocks and nappy markers.
6. **Weekly history:** seven 24h strips side by side (a Huckleberry-style sleep chart).

## Deliverables

- The token set as CSS variables for light and dark, plus a matching `tailwind.config` theme extension for NativeWind.
- A component sheet and the mocked screens above.
- A short note on the rationale for the palette and type choices.
