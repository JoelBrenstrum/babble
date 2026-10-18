import {
  createBabbleClient,
  DEVICE_HEADER,
  homeAssistantData,
  toBabbleError,
  type BabbleErrorCode,
  type HomeAssistantBaby,
  type HomeAssistantData,
} from '@babble/api';
import { familyHasFeature, parsePublicConfig, type PublicConfig } from '@babble/config';
import { homeAssistantSnapshot, homeWindow, planHomeAssistantAction, predictionSince } from '@babble/domain';

const NO_STORE = { 'cache-control': 'no-store' };

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });
const problem = (status: number, error: string) => json({ error }, status);

const STATUS: Partial<Record<BabbleErrorCode, number>> = {
  not_signed_in: 401,
  forbidden: 403,
  session_conflict: 409,
  invalid_input: 400,
};

function failure(error: unknown): Response {
  const babble = toBabbleError(error);
  return problem(STATUS[babble.code] ?? 500, babble.message);
}

export function homeAssistantConfig(config: PublicConfig): Response {
  return json({
    public_url: config.publicUrl,
    supabase_url: config.supabaseUrl,
    supabase_anon_key: config.supabaseAnonKey,
    device_sign_in: config.deviceSignInEnabled,
  });
}

export function bearerToken(request: Request): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '');
  return match?.[1] ?? null;
}

export interface Connection {
  data: HomeAssistantData;
  billingEnabled: boolean;
}

export async function connect(
  request: Request,
  env: Record<string, string | undefined> = process.env,
): Promise<Connection | Response> {
  const token = bearerToken(request);
  if (!token) return problem(401, 'Sign in to babble first.');
  const config = parsePublicConfig(env);
  const device = request.headers.get(DEVICE_HEADER);
  const client = createBabbleClient(config, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Capitalised so supabase-js replaces it rather than sending two Bearer values to the auth server.
    global: { headers: { Authorization: `Bearer ${token}`, ...(device ? { [DEVICE_HEADER]: device } : {}) } },
  });
  const { error } = await client.auth.getUser(token);
  if (error) return problem(401, toBabbleError({ status: 401 }).message);
  return { data: homeAssistantData(client), billingEnabled: config.billingEnabled };
}

export function babySummary(baby: HomeAssistantBaby) {
  return { id: baby.id, name: baby.name, family_id: baby.family_id, family_name: baby.family_name };
}

export async function listBabies({ data }: Connection): Promise<Response> {
  try {
    return json((await data.babies()).map(babySummary));
  } catch (error) {
    return failure(error);
  }
}

async function snapshotFor({ data, billingEnabled }: Connection, baby: HomeAssistantBaby, now: Date) {
  const predictions = familyHasFeature(billingEnabled, baby.plan, 'predictions');
  const { since } = homeWindow(now, baby);
  const lookback = predictions ? predictionSince(now) : since;
  const [settings, events] = await Promise.all([
    data.settings(baby.id),
    data.events(baby.id, lookback < since ? lookback : since),
  ]);
  return homeAssistantSnapshot({
    now,
    baby: {
      id: baby.id,
      name: baby.name,
      birthDate: baby.birth_date,
      sex: baby.sex,
      timeZone: baby.timezone,
      dayStartMinutes: baby.day_start_minutes,
    },
    settings,
    events,
    predictions,
  });
}

async function findBaby(connection: Connection, babyId: string) {
  return (await connection.data.babies()).find((baby) => baby.id === babyId) ?? null;
}

export async function babyState(connection: Connection, babyId: string, now = new Date()): Promise<Response> {
  try {
    const baby = await findBaby(connection, babyId);
    if (!baby) return problem(404, 'That baby is not in your family.');
    return json(await snapshotFor(connection, baby, now));
  } catch (error) {
    return failure(error);
  }
}

export async function runAction(
  connection: Connection,
  babyId: string,
  action: string,
  request: Request,
  now = new Date(),
): Promise<Response> {
  try {
    const baby = await findBaby(connection, babyId);
    if (!baby) return problem(404, 'That baby is not in your family.');
    const body = await request.json().catch(() => ({}));
    const plan = planHomeAssistantAction(action, body, await connection.data.running(babyId), now);
    if (!plan.ok) return problem(plan.status, plan.error);
    await connection.data.perform(babyId, plan.step);
    return json(await snapshotFor(connection, baby, new Date()));
  } catch (error) {
    return failure(error);
  }
}

export async function withConnection(
  request: Request,
  handle: (connection: Connection) => Promise<Response>,
): Promise<Response> {
  const connection = await connect(request);
  return connection instanceof Response ? connection : handle(connection);
}
