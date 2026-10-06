# Self-hosting Babble

Babble is one web container plus a Supabase backend. The container holds no data; everything lives in Supabase.

## 1. Supabase

Choose one:

- **Supabase Cloud** (simplest): create a project at supabase.com. The free tier is enough for a family.
- **Self-hosted Supabase**: follow the official guide at https://supabase.com/docs/guides/self-hosting/docker. It runs about ten containers and can sit next to Babble on the same machine (e.g. Unraid).

Then configure Supabase Auth:

- **Site URL**: your `PUBLIC_URL`
- **Redirect URLs**: `${PUBLIC_URL}/auth/callback`
- Optionally enable the **Google** provider.

## 2. Apply the database schema

From a checkout of this repository, with the Supabase CLI (`pnpm install` provides it):

```sh
cd packages/db
pnpm exec supabase db push --db-url "postgresql://postgres:<password>@<host>:5432/postgres"
```

New instances are **invite-only**: the first account can sign up freely, and everyone after that needs an invite code from an existing family. To allow open sign-ups, run this in the SQL editor:

```sql
update private.instance_settings set signup_mode = 'open';
```

## 3. Run the web app

```sh
cd infra/self-host
cp .env.example .env   # fill in PUBLIC_URL, SUPABASE_URL and SUPABASE_ANON_KEY
docker compose up -d
```

Put it behind your reverse proxy with HTTPS. HTTPS is required to install Babble on a phone's home screen.

### Unraid

Add a container with the image `ghcr.io/joelbrenstrum/babble-web:latest`, map port 3000, and set the same environment variables as `.env.example`.

## Updating

Pull the new image and apply any new migrations (step 2), then restart the container.
