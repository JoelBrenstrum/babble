# Todo

Ideas to add to Babble. Each item gets picked up and folded into the relevant stage plan in [docs/stages/](docs/stages/).
- [ ] **Stats: hover or tap a bar to see that day's breakdown.** Each bar in the Stats charts shows a breakdown for that single day: on hover on desktop (a popover next to the bar), and on tap on touch devices (a bottom sheet). On desktop, clicking the bar keeps the popover open so its link can be followed. For example, on the feeds chart: each feed's start time, duration, left / right / downtime split, and bottle amounts, plus the day's totals. Use the baby's day start for day boundaries, add a link to that day in History, and show the selected bar as highlighted. Web and Expo.

## Future

- [ ] **Home Assistant integration.** Expose Babble to Home Assistant: sensors (time since last feed, next side, nap running and for how long, last nappy) and actions (start or stop a nap or feed, log a nappy) for automations, dashboards and buttons. Scope still to be worked out: a custom integration, MQTT, or a REST/webhook API with per-family tokens.
