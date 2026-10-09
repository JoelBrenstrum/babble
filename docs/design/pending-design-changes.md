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
> - **Landing page (`/welcome`):** header with the wordmark and "Sign in". Hero: "Track your baby's day, together." (34px, 48px on desktop), subline "Feeds, sleep, nappies and more, shared live with everyone who helps. Free, private and open source.", a primary "Get started" and secondary "See what it does". Beside it on desktop (below on phones) a framed, faded preview of the Home screen with a running breastfeed card. Then "What babble does": a grid of 13 cards, each with a tracker-tinted icon tile, a title and one or two lines. Then "See the day at a glance": a framed day timeline preview next to the day totals cards, with captions. Then a surface-coloured "Private and open source" panel with four short points and links to the privacy policy and terms. A closing "Ready when you are" with Get started, and a footer with the wordmark and Sign in · Privacy · Terms · GitHub.
> - **Privacy policy and Terms of use:** a readable single column (max ~65ch) with the wordmark, a title, "Last updated 9 October 2026", section headings, short paragraphs and bullet lists, and "Back to babble" at the end.
> - **Sign-in:** a meta ink-2 line under the form: "By continuing you agree to the Terms of use and Privacy policy." with both as links. **Settings:** an "About" section at the bottom with "Privacy policy" and "Terms of use" rows.

