# Stage 0: Foundations

**Goal:** an empty but deployable product. Two people can sign in on web and mobile and share a baby, both locally and on a self-hosted stack.

## Scope

- Monorepo (pnpm + Turborepo), TypeScript, ESLint/Prettier, Vitest, `LICENSE` (AGPL-3.0)
- CI: typecheck, lint, unit tests, pgTAP RLS tests, a web build, and a compose smoke test
- `apps/web` (TanStack Start) and `apps/mobile` (Expo) scaffolds wired to the shared `api`, `hooks` and `tokens` packages
- Local dev with the Supabase CLI (`supabase start`)
- Migrations: `families`, `family_members`, `babies`, `baby_settings`, plus RLS policies and pgTAP tests
- Runtime config: env-driven endpoints, `SIGNUP_MODE`, `BILLING_ENABLED`, and an `entitlements()` stub that returns everything
- Auth: email magic link + Google (both on web and Expo). Apple is added when the iOS app ships. Google is optional for self-hosters.
- Supabase Cloud project for our family; local dev uses the Supabase CLI
- Onboarding: create family → add baby → day start. Invite a caregiver: a QR code + short code (e.g. `K7Q-4MD`) that expires in 7 days and can be used once, plus a share link.
- Delete account: signs out everywhere. Baby records stay with the family while another member remains.
- `packages/tokens` from `docs/design/tokens` (shared CSS variables + NativeWind and web Tailwind presets), with Figtree and Lucide wired into both apps
- App shells per [ui.md](../ui.md#global) and the [design](../design/README.md): web is responsive from phone to desktop, with a PWA manifest and service worker for the app shell. Mobile has tabs. Light/dark theme.
- `apps/web/Dockerfile` (single image, env-configured, pointed at an external Supabase), deployed to Fly.io (`*.fly.dev`). The same image runs on Unraid.
- `infra/self-host/docker-compose.yml` + `.env.example` + README, working from day one
- Expo app: dev builds on Android / Expo Go only for now. No Apple Developer account yet, so iPhones use the web PWA.

## Done when

- Two accounts can sign in on web (desktop and phone) and mobile, and see the same baby.
- The web image is live on `*.fly.dev` against Supabase Cloud.
- `docker compose up` from `infra/self-host` gives a working instance.
- RLS tests prove one family can't read another family's data.

## Tests

- pgTAP: RLS for every table, for each role
- Unit: config parsing, `entitlements()`

## Status (2026-10-07)

Built on branch `stage-0`:

- [x] Monorepo, Turborepo, Prettier, Vitest, AGPL-3.0 licence, CI workflow
- [x] `packages/config`, `packages/tokens` (generated from the design, with drift test), `packages/api`, `packages/db`
- [x] Migration for families, members, babies, settings, invites, invite-only sign-up, account deletion, plus pgTAP tests
- [x] Web: sign-in (magic link + Google), auth callback, invite links, onboarding (family → baby → day start → invite), responsive shell (sidebar / rail / tab bar), Home, History, Stats, Settings, PWA manifest and icons, `/api/health`
- [x] Mobile: the same flows in Expo with NativeWind, deep-link auth (`babble://auth/callback`)
- [x] Dockerfile, `fly.toml`, self-host compose + README
- [x] React Cosmos on web and mobile, with fixtures

Verified locally:

- [x] Migration applies and all 38 pgTAP tests pass
- [x] `packages/api/src/database.types.ts` regenerated from the real schema
- [x] Playwright E2E (phone + desktop): magic-link sign-in via Mailpit → family → baby → day start → invite → Home → Settings (`pnpm --filter @babble/web e2e`)
- [x] Docker image builds (242 MB) and serves the app

Deployed (2026-10-07):

- [x] Supabase Cloud project in Sydney (`ap-southeast-2`); migrations applied with `supabase db push --db-url` through the IPv4 session pooler (the direct database host is IPv6-only). Connection details live in `packages/db/.env.cloud` (gitignored).
- [x] Fly app `babble-app` in `syd`, live at https://babble-app.fly.dev. Fly's first deploy failed to allocate IPs; fixed with `fly ips allocate-v6` and `fly ips allocate-v4 --shared`.
- [x] Custom domain https://babble.brenstrum.com (Fly certificate, CNAME `babble` → `babble-app.fly.dev`, `PUBLIC_URL` secret)
- [x] Supabase Auth URL configuration: Site URL `https://babble.brenstrum.com`, redirects `https://babble.brenstrum.com/auth/callback`, `https://babble-app.fly.dev/auth/callback` (until everyone has moved) and `babble://auth/callback`
- [x] Custom SMTP through Resend, sending as `babble <hello@babble.brenstrum.com>` (domain verified in Resend, SMTP and rate limit set in the dashboard)
- [x] Branded auth email templates in `packages/db/supabase/templates/`, used locally via `config.toml`; to be pasted into the cloud dashboard
- [ ] Google OAuth client, then `GOOGLE_AUTH_ENABLED = "true"` in `fly.toml`

Deviation from the plan: `infra/self-host` runs only the web container and points at an existing Supabase (Cloud or the official self-hosting stack), instead of bundling the ~10 Supabase containers itself.
