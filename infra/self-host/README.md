# Self-hosting Babble

Babble is one web container plus a Supabase backend. The container holds no data; everything lives in Supabase.

## 1. Supabase

Choose one:

- **Supabase Cloud** (simplest): create a project at supabase.com. The free tier is enough for a family.
- **Self-hosted Supabase**: follow the official guide at https://supabase.com/docs/guides/self-hosting/docker. It runs about ten containers and can sit next to Babble on the same machine (e.g. Unraid).

Then configure Supabase Auth:

- **Site URL**: your `PUBLIC_URL`
- **Redirect URLs**: exactly `${PUBLIC_URL}/auth/callback`, plus `babble://auth/callback` if you use the mobile app. Don't add wildcards such as `babble://**` or `exp://**`: another app could catch a sign-in link meant for Babble.
- **Secure password change** on, so changing a password needs a fresh sign-in.
- **Confirm email** on if sign-ups are open.
- Custom **SMTP**, so sign-in emails aren't limited to Supabase's test sender.
- Optionally enable the **Google** provider.

If you self-host Supabase, before exposing it:

- Replace every default in its `.env`: `POSTGRES_PASSWORD`, `JWT_SECRET` (then generate new `ANON_KEY` and `SERVICE_ROLE_KEY` from it) and `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`.
- Keep Postgres (5432) and Studio off the public internet. Only the API gateway (Kong, port 8000) needs to be reachable, behind HTTPS.

## 2. Apply the database schema

From a checkout of this repository, with the Supabase CLI (`pnpm install` provides it):

```sh
cd packages/db
pnpm exec supabase db push --db-url "postgresql://postgres:<password>@<host>:5432/postgres"
```

New instances are **invite-only**: the first account can sign up freely, and everyone after that needs an invite code from an existing family. Create your own account straight after deploying, so nobody else can claim the first one. To allow open sign-ups, run this in the SQL editor:

```sql
update private.instance_settings set signup_mode = 'open';
```

## 3. Run the web app

```sh
cd infra/self-host
cp .env.example .env   # fill in PUBLIC_URL, SUPABASE_URL and SUPABASE_ANON_KEY
docker compose up -d
```

Put it behind your reverse proxy with HTTPS. HTTPS is required to install Babble on a phone's home screen. The container only listens on `127.0.0.1` by default; if your proxy runs on another machine, set `BABBLE_BIND=0.0.0.0` in `.env` and firewall the port.

### Unraid

Add a container with the image `ghcr.io/joelbrenstrum/babble-web:latest`, map port 3000, and set the same environment variables as `.env.example`.

## Updating

Pull the new image and apply any new migrations (step 2), then restart the container.
