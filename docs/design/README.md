# Babble Design (Claude Design export)

Exported from Claude Design on 2026-10-07. Direction: **"Sage"** (design system v1, screens v1.1), derived from the Organic system. See [ui.md](../ui.md) for which file holds which screen.

## Files

| File | What it is |
|---|---|
| `Babble Design System.dc.html` | Tokens, components, states and screen thumbnails, in light and dark |
| `Babble Screens v1.1.dc.html` | Overview of every v1.1 screen, plus the desktop / tablet / phone responsive rules |
| `Phone Forms.dc.html` | Bottle, sleep, pump, growth and custom forms and timers |
| `Phone Flows.dc.html` | Feed detail/edit, imported feed, nap prompts, reminder notification, Home states |
| `Phone Lists.dc.html` | Sleep, nappy, pump and growth lists, empty and loading states |
| `Phone Account.dc.html` | Sign-in, onboarding, invite, settings, delete account, PWA install |
| `Web.dc.html` | Desktop and tablet web: home, feeds split view, add dialog, history, import, settings |
| `Screen.dc.html` | Phone screens. `screen` prop: `home`, `timer`, `nappy`, `feeds`, `day`, `week` |
| `Phone.dc.html` | Home + breastfeed timer in a phone frame |
| `Babble Directions.dc.html` | The three explored directions (Clay, Sage, Lamplight). Sage was chosen. |
| `tokens/babble-tokens.css` | **Source of truth for tokens.** CSS variables as RGB channels, light + dark, plus poo swatches, fonts and motion |
| `tokens/babble-tokens.js` | The same tokens as hex values |
| `tokens/tailwind.config.js` | NativeWind theme extension (type scale, radii, spacing, shadows) |
| `tokens/shadcn-theme.css` | Maps the Babble tokens onto shadcn/ui variables for the web app (load after `babble-tokens.css`) |
| `_ds/organic-*/` | The underlying Organic design system (styles + guide) |
| `support.js` | Claude Design runtime needed to render the `.dc.html` files |

To view the designs, open a `.dc.html` file in a browser. Fonts and icons load from Google Fonts and unpkg.

## Keeping the design in sync

UI changes made in code are logged in [pending-design-changes.md](pending-design-changes.md) as a prompt to paste into Claude Design. After applying it there, re-export and replace this folder (keeping this README and that file).

## How it maps into the code

- `packages/tokens` (Stage 0) is generated from `tokens/`:
  - `babble-tokens.css` is shared as-is by web (Tailwind) and mobile (NativeWind `global.css`).
  - A shared theme object (colours, type scale, radii, spacing, shadows, motion) feeds two presets: a NativeWind preset based on `tokens/tailwind.config.js`, and a web Tailwind preset that uses CSS font weights instead of per-weight font families.
- **Fonts:** Figtree (400/500/600/700) everywhere, with tabular figures for timers. Caprasimo for the wordmark only.
- **Icons:** Lucide (`lucide-react` on web, `lucide-react-native` on mobile).
- **Poo colour keys** match `PooColour` in `packages/domain` (`dark-green` ↔ `dark_green`, `white-grey` ↔ `white_grey`).

The tokens are unchanged from v1 and work for both apps.
