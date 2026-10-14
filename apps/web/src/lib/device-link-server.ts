import {
  createBabbleClient,
  deviceLabel,
  newDeviceLinkCode,
  newDeviceLinkSecret,
  toBabbleError,
  type BabbleClient,
} from '@babble/api';
import { parseServerConfig } from '@babble/config';

const MAX_CODE_ATTEMPTS = 3;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET = /^[0-9a-f]{64}$/;
const NO_STORE = { 'cache-control': 'no-store' };

let admin: BabbleClient | null = null;

export function adminClient(env: Record<string, string | undefined> = process.env): BabbleClient | null {
  if (admin) return admin;
  if (!env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return null;
  const config = parseServerConfig(env);
  admin = createBabbleClient(
    { supabaseUrl: config.supabaseUrl, supabaseAnonKey: config.supabaseServiceRoleKey },
    { auth: { persistSession: false, autoRefreshToken: false, flowType: 'implicit' } },
  );
  return admin;
}

export async function hashSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function requesterAddress(headers: Headers): string | null {
  return headers.get('fly-client-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });
const unavailable = () => json({ error: "Signing in with another device isn't set up on this server." }, 503);

export async function startDeviceLink(client: BabbleClient | null, request: Request): Promise<Response> {
  if (!client) return unavailable();
  const secret = newDeviceLinkSecret();
  const secretHash = await hashSecret(secret);
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = newDeviceLinkCode();
    const { data, error } = await client.rpc('start_device_link', {
      new_code: code,
      new_secret_hash: secretHash,
      new_device: deviceLabel(request.headers.get('user-agent')),
      new_requested_from: requesterAddress(request.headers) ?? undefined,
    });
    if (error?.code === '23505') continue;
    if (error) {
      const problem = toBabbleError(error);
      return json({ error: problem.message }, problem.code === 'too_many_codes' ? 429 : 500);
    }
    const [row] = data;
    if (row) return json({ id: row.id, code, secret, expiresAt: row.expires_at });
  }
  return json({ error: toBabbleError(null).message }, 500);
}

export async function pollDeviceLink(client: BabbleClient | null, request: Request): Promise<Response> {
  if (!client) return unavailable();
  const body = (await request.json().catch(() => null)) as { id?: unknown; secret?: unknown } | null;
  const id = typeof body?.id === 'string' ? body.id : '';
  const secret = typeof body?.secret === 'string' ? body.secret : '';
  if (!UUID.test(id) || !SECRET.test(secret)) return json({ error: 'Invalid request' }, 400);

  const { data, error } = await client.rpc('claim_device_link', {
    link_id: id,
    link_secret_hash: await hashSecret(secret),
  });
  if (error) return json({ error: toBabbleError(error).message }, 500);
  const [row] = data;
  if (!row || row.status !== 'approved') return json({ status: row?.status ?? 'expired' });
  if (!row.email) return json({ status: 'expired' });

  const link = await client.auth.admin.generateLink({ type: 'magiclink', email: row.email });
  const tokenHash = link.data.properties?.hashed_token;
  if (link.error || !tokenHash) return json({ error: toBabbleError(link.error).message }, 500);
  return json({ status: 'approved', tokenHash });
}
