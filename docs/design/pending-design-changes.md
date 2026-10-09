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

