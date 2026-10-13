# Stage 8: Babble Plus billing

Full plan, with prices, fees, architecture and rollout: **[Babble Plus Billing](https://claude.ai/artifact/MF8kTF2qWKTjnNnqSPH3GA)** (private; open it signed in, or share it from its Share menu).

## Summary

- **Prices:** NZ$80 a year (shown first, "Save 33%") or NZ$10 a month, GST inclusive, charged in NZD.
- **Who pays:** one subscription per family. Only admins can subscribe, switch plans or cancel; other members see "Ask an admin to subscribe".
- **Web (Stripe Billing):** Stripe Checkout to subscribe, the Stripe customer portal to manage, and a webhook that updates `private.family_billing`, which sets `families.plan`. Plus while the subscription is `trialing`, `active` or `past_due`; free once `canceled` or `unpaid`. Comped families (`families.plan_source = 'comp'`) are never downgraded by Stripe.
- **Server routes:** `POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/billing/webhook`. Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. Self-hosted servers without Stripe keys keep billing off.
- **iOS:** outside the US, Apple only allows web-bought Plus in the app if it can also be bought in the app, and the app can't link to web checkout. Until in-app purchases exist, the mobile Plus sheet shows no price and no link.

## Phases

1. **Build in Stripe test mode:** migration, routes, Plus sheet and Settings card, tests, `stripe listen` locally.
2. **Go live:** GST decision, live Stripe product and prices, webhook endpoint, Fly secrets, comp our family, turn on `BILLING_ENABLED` and `billing_enabled`.
3. **App Store and Play:** in-app purchases at the same prices through RevenueCat, connected to the same Stripe products.

## Open decisions

- Free trial: suggested 14 days, no card, started from the Plus sheet.
- Existing families on launch: suggested a free month of Plus.
- GST registration: check with an accountant.
- Refunds: suggested Plus runs to the end of the period on cancel, refunds on request in the first 14 days of a yearly plan.
