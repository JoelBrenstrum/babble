# Babble

A calm, detailed baby tracker: sleep, breastfeeds (with per-side segments and downtime), bottles, nappies, pumping, growth and custom events. A TanStack Start web app (also an installable phone PWA) and an Expo mobile app, backed by Supabase.

Planning lives in [docs/PLAN.md](docs/PLAN.md). Licensed under [AGPL-3.0](LICENSE).

## Layout

| Path              | What                                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| `apps/web`        | TanStack Start web app + PWA                                                 |
| `apps/mobile`     | Expo (iOS/Android) app                                                       |
| `packages/domain` | Pure domain logic (formatting, Huckleberry CSV import, tracker metadata)     |
| `packages/api`    | Typed Supabase data access, query options, onboarding rules, shared fixtures |
| `packages/config` | Runtime config parsing and entitlements                                      |
| `packages/tokens` | Design tokens → web Tailwind theme + NativeWind preset                       |
| `packages/db`     | Supabase config, migrations and pgTAP tests                                  |
| `infra/self-host` | Running Babble on your own server                                            |

## Getting started

Requires Node 24, pnpm (via `corepack enable`) and Docker.

```sh
pnpm install
pnpm --filter @babble/db start        # local Supabase (prints the anon key)
pnpm --filter @babble/db test         # database / RLS tests
```

### Web

```sh
cp apps/web/.env.example apps/web/.env   # set SUPABASE_ANON_KEY from `supabase start`
pnpm --filter @babble/web dev            # http://localhost:3210
```

In development, the sign-in screen (web and mobile) has **Sign in as John / Jane** buttons. They use accounts seeded by `packages/db/supabase/seed.sql` (password `password`), already set up as the Smiths with baby Olivia. `pnpm --filter @babble/db reset` restores them. The buttons are compiled out of production builds, and the seed only runs against the local database.

Magic-link emails are captured locally by Supabase's Mailpit at http://127.0.0.1:54324.

### Mobile

```sh
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @babble/mobile start
```

## React Cosmos

Component fixtures live next to their components as `*.fixture.tsx`, using shared sample data from `@babble/api/fixtures`. Each playground has a light/dark theme control.

- **Web:** `pnpm --filter @babble/web cosmos` → http://localhost:5000. `cosmos:export` builds a static version.
- **Mobile:** `pnpm --filter @babble/mobile cosmos` starts the playground on port 5101 and generates `src/cosmos.imports.ts`. In another terminal, `pnpm --filter @babble/mobile cosmos:app` starts the app in Cosmos mode (a standalone entry, `src/cosmos-app.tsx`), which connects to the playground over your LAN.

## Checks

```sh
pnpm test        # all unit tests
pnpm typecheck
pnpm format:check
```

## Deploying

- **Fly.io:** `fly deploy` from the repo root (see `fly.toml` for the secrets to set).
- **Self-hosted / Unraid:** see [infra/self-host/README.md](infra/self-host/README.md).
