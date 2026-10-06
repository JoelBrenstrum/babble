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
