# Architecture

## Key decisions

| #   | Decision                      | Choice                                                                                                                                                                                                                                      | Why                                                                                                                                                                                                      |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Web + mobile                  | Two apps: **TanStack Start** for web, **Expo** (Expo Router) for iOS/Android. They share all logic but not UI components. No Expo web.                                                                                                      | Web can grow into richer, denser views without React Native constraints, and it doubles as the phone client for self-hosters (D12).                                                                      |
| D2  | Repo layout                   | pnpm + Turborepo monorepo                                                                                                                                                                                                                   | Domain logic lives in a pure, unit-tested package that both apps consume.                                                                                                                                |
| D3  | Backend                       | **Supabase** (Postgres, Auth, Row Level Security, Realtime). Use only features that self-hosted Supabase also has.                                                                                                                          | Postgres fits the base-table-plus-detail-tables model. RLS handles sharing a baby between caregivers. Realtime means a partner sees a running timer straight away. Self-hosting is officially supported. |
| D4  | Offline                       | Online-first in v1, **designed for local-first later**: client-generated UUIDs, client timestamps, `updated_at`, soft deletes. TanStack Query mutation persistence replays offline writes. Evaluate PowerSync later.                        | Bad signal at 3am is real. These conventions keep the upgrade cheap.                                                                                                                                     |
| D5  | Styling                       | Web: Tailwind + shadcn/ui (Radix), restyled to the babble tokens. Mobile: NativeWind + a small in-house component set. A shared `tokens` package, generated from [design/tokens](design/README.md), feeds both. Figtree font, Lucide icons. | Same look on both platforms, with components native to each. Dark mode matters for night feeds.                                                                                                          |
| D6  | Testing                       | Vitest for `domain`, `api`, `hooks` and web components (Testing Library). Jest + React Native Testing Library for mobile. pgTAP for RLS. Playwright for web E2E (including a phone viewport). Maestro for mobile E2E later.                 | The tricky logic (segments, downtime, day bucketing, reminders, CSV parsing) is pure and easy to test.                                                                                                   |
| D7  | Timers                        | A timer is a stored `started_at` with `ended_at = null`, never a client-side counter.                                                                                                                                                       | Timers survive the app being killed, phone restarts, and switching devices.                                                                                                                              |
| D8  | Units                         | Store metric (ml, g, mm). Display in the user's preferred units.                                                                                                                                                                            | One source of truth.                                                                                                                                                                                     |
| D9  | Multi-baby / multi-caregiver  | In the schema from day one: `families` → `babies` and `family_members`.                                                                                                                                                                     | Twins, partners and grandparents. Adding this later is a painful migration.                                                                                                                              |
| D10 | Deployment modes              | One codebase serves **self-hosted** and **hosted (public product)**, switched by configuration.                                                                                                                                             | Family use now, a possible public release later, without a rewrite.                                                                                                                                      |
| D11 | Server-side logic             | Postgres functions (RPCs) for multi-row atomic actions. TanStack Start server functions for anything needing secrets (invites, push, billing).                                                                                              | Works the same self-hosted. No dependency on hosted-only services.                                                                                                                                       |
| D12 | Phone access when self-hosted | **No store app for self-hosted.** The web app is mobile-first responsive and an installable **PWA**.                                                                                                                                        | Self-hosters log from their phones through the browser, so the web app needs logging as fast as the native app's.                                                                                        |
| D13 | License                       | **AGPL-3.0**                                                                                                                                                                                                                                | Anyone can self-host freely, but nobody can run a closed competing hosted service from the code.                                                                                                         |
| D14 | Identifiers                   | Bundle / application ID `com.brenstrum.babble`                                                                                                                                                                                              |                                                                                                                                                                                                          |

## Repo layout

```
babble/
├─ apps/
│  ├─ web/                 TanStack Start (SSR, server functions, TanStack Router + Query), PWA
│  └─ mobile/              Expo Router (iOS, Android), hosted product only
├─ packages/
│  ├─ domain/              Pure TS: types, segment/downtime logic, day bucketing,
│  │                       reminder calc, formatting, Huckleberry CSV parsing + mapping.
│  │                       No React, no I/O.
│  ├─ db/                  Supabase migrations, seed, generated types, RPC SQL, pgTAP RLS tests
│  ├─ api/                 Typed data-access functions over supabase-js + TanStack Query
│  │                       query/mutation option factories
│  ├─ hooks/               Platform-agnostic React hooks (useRunningTimer, useSegmentSession,
│  │                       useDailySummary) built on api + domain. Renders nothing.
│  └─ tokens/              Design tokens → Tailwind preset (web) + NativeWind preset (mobile)
├─ infra/
│  └─ self-host/           docker-compose (Supabase stack + web), .env.example, README
└─ docs/
```

Rules:

- `domain` imports nothing from React, Supabase, Expo or TanStack.
- Screens are thin. They call `hooks`, which call `api` and `domain`. A web screen and its mobile equivalent should differ only in markup and styling.
- Both apps use the same TanStack Query keys and options, so caching, optimistic updates and realtime invalidation behave the same on both.

**The cost of two apps:** every screen is built twice. To keep that cheap, all state, derivations and mutations live in shared packages, and each screen is specified once in [ui.md](ui.md). Because the web app is also the phone client for self-hosters (D12), **web has to reach full logging parity, at phone size, in Stage 1**. Expo still adds what a browser can't: lock-screen timers, widgets and reliable local notifications.

## Deployment modes

| Concern       | Self-hosted                                                   | Hosted product                                                                 |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Backend       | Self-hosted Supabase via `infra/self-host/docker-compose.yml` | Supabase Cloud                                                                 |
| Web           | Node container from the same compose file                     | Vercel / Netlify / Cloudflare                                                  |
| Phone         | Web app as an installable PWA                                 | Expo store app + web/PWA                                                       |
| Sign-up       | `SIGNUP_MODE=invite_only` (default) or `open`                 | `open`                                                                         |
| Billing       | `BILLING_ENABLED=false`: every feature unlocked               | Stripe (web) + RevenueCat (in-app purchase), behind entitlements on `families` |
| Email         | Any SMTP the operator supplies                                | Transactional provider                                                         |
| Telemetry     | Off                                                           | Opt-in crash reporting (Sentry) only. No analytics on baby data.               |
| Notifications | Web Push (VAPID keys generated at install)                    | Expo push + local notifications on native, Web Push on web                     |

### Our family's deployment: one image + external Supabase

The web app ships as a **single Docker image** (`apps/web/Dockerfile`, a multi-stage Node build of the TanStack Start server). All configuration comes from environment variables, so the image runs anywhere and **points at an external Supabase**:

```
PUBLIC_URL=https://babble.fly.dev
SUPABASE_URL=https://<project>.supabase.co      # or a self-hosted Supabase URL
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...                    # server-side only (invites, push)
SIGNUP_MODE=invite_only
BILLING_ENABLED=false
VAPID_PUBLIC_KEY=... / VAPID_PRIVATE_KEY=...     # Web Push
```

- **Initially on Fly.io** (`fly.toml` in `apps/web`, served at a `*.fly.dev` domain with HTTPS included), so there's no reverse-proxy or certificate setup to start with.
- **On Unraid** the same image runs as one container (Docker template / compose) behind the existing reverse proxy. HTTPS is required for PWA install and Web Push.
- **"External DB" means an external Supabase, not plain Postgres.** The app relies on Supabase Auth, PostgREST (RLS) and Realtime. Options:
  - **Supabase Cloud (chosen for our family):** free tier, nothing extra to run, backups included. The Unraid box only runs the web container.
  - **Self-hosted Supabase**, on Unraid or elsewhere, using `infra/self-host`. It's about 10 containers, but everything stays local.
- Migrations are applied with the Supabase CLI (`supabase db push`) from CI or a laptop, never by the web container at startup.
- The image is published to GHCR on each tagged release, so Unraid can pull updates.

What this means for the design from day one:

- No hard-coded URLs. All endpoints come from runtime config.
- Every feature check goes through `entitlements(family)`, which returns everything when billing is off.
- Baby data is health-adjacent and sensitive: RLS on every table with automated tests, account deletion, full data export (also required for App Store / Play review), and a privacy policy before any public release.
- Anything scheduled server-side (e.g. push reminders) must run in both modes: a TanStack Start route triggered by `pg_cron` + `pg_net`, or a small worker in the compose file. Never a hosted-only scheduler.
