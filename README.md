# babble

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
| `infra/self-host` | Running babble on your own server                                            |

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

Browser tests (Playwright, phone and desktop) run against a dev server on port 3210, reusing one that's already running:

```sh
cd apps/web && PUBLIC_URL=http://localhost:3210 pnpm exec playwright test e2e/chair.spec.ts
```

Specs open sign-ups with `setSignupMode('open')` from `e2e/db.ts` and create accounts with `signUpWithPassword`, so they work alongside your own dev session. The few that test magic links (onboarding, password recovery) need Mailpit and a dev server they start themselves.

## Deploying

- **Fly.io + Supabase:** live at https://babble.brenstrum.com (Fly app `babble-app`, also reachable at https://babble-app.fly.dev). Merging to `main` releases automatically: once CI passes, the `deploy` job in `.github/workflows/ci.yml` applies new migrations with `supabase db push` and then runs `fly deploy --remote-only`. It needs the repo secrets `SUPABASE_DB_URL` (the session pooler connection string, since GitHub runners have no IPv6) and `FLY_API_TOKEN` (`fly tokens create deploy -a babble-app`) in the `production` environment. To release by hand, apply migrations with `pnpm --filter @babble/db exec supabase db push --db-url "$SUPABASE_DB_URL"` (with `--dry-run` first), then run `fly deploy --remote-only` from the repo root. Each build stamps a release id (the build time, or `BABBLE_RELEASE`), served at `/api/version`; open tabs show a refresh banner when it changes.
- **Staging (test environment):** Fly app `babble-staging` at https://babble-staging.fly.dev, backed by its own Supabase project. Every pull request gets a `Deploy staging / approve` check that waits for you: the `staging-approval` GitHub environment requires a reviewer, so nothing deploys until you open the check's details and click Review deployments → Approve. It never blocks merging. A new push to the PR replaces the waiting run, and approved deploys queue one at a time behind a shared `deploy-staging` lock. You can also start one by hand with `gh workflow run deploy-staging.yml --ref my-branch` or Actions → Deploy staging → Run workflow, which needs the same approval. It shares the migrate-then-`fly deploy` steps with production (`.github/workflows/deploy.yml`) but uses `fly.staging.toml` and the `staging` GitHub environment's `SUPABASE_DB_URL` and `FLY_API_TOKEN`, and is not gated on CI. Pointing it at a new Supabase project takes `fly secrets set -a babble-staging SUPABASE_URL=... SUPABASE_ANON_KEY=...`, the Auth Site URL `https://babble-staging.fly.dev` with redirect `https://babble-staging.fly.dev/auth/callback`, and `SUPABASE_ACCESS_TOKEN=… pnpm --filter @babble/db push:email-templates <project-ref>` for the email templates. The first account to sign up on a fresh database needs no invite.
- **Raspberry Pi chair screen:** see [docs/raspberry-pi.md](docs/raspberry-pi.md).
- **Self-hosted / Unraid:** see [infra/self-host/README.md](infra/self-host/README.md).
