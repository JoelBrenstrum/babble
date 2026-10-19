import { BabbleError, type BabySettings, type HomeAssistantBaby, type HomeAssistantData } from '@babble/api';
import type { BabyEvent } from '@babble/domain';
import { describe, expect, it, vi } from 'vitest';
import {
  babyState,
  bearerToken,
  connect,
  homeAssistantConfig,
  listBabies,
  runAction,
  type Connection,
} from './home-assistant-server';

const NOW = new Date('2026-10-06T12:00:00Z');

const BABY: HomeAssistantBaby = {
  id: 'baby-1',
  family_id: 'family-1',
  family_name: 'Brenstrums',
  plan: 'free',
  name: 'Olive',
  birth_date: '2026-09-01',
  sex: 'female',
  timezone: 'UTC',
  day_start_minutes: 0,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};

const SETTINGS = {
  baby_id: 'baby-1',
  feed_reminder_enabled: true,
  feed_reminder_interval_min: 180,
  feed_reminder_at_night: false,
  night_start_minutes: 1140,
  night_end_minutes: 420,
  nappy_prompt: 'off',
  updated_at: '2026-09-01T00:00:00Z',
  units: 'metric',
  downtime_merge_threshold_sec: 15,
  auto_end_paused_session_min: 30,
} as BabySettings;

const NAP = {
  id: 'nap',
  babyId: 'baby-1',
  type: 'sleep',
  startedAt: '2026-10-06T11:00:00Z',
  endedAt: null,
  notes: null,
  segments: [],
  details: { locations: [], fallAsleep: null, startMoods: [], endMoods: [], wokenByCarer: false, quality: null },
  createdBy: 'user-1',
  createdDevice: null,
  createdAt: '2026-10-06T11:00:00Z',
  updatedAt: '2026-10-06T11:00:00Z',
  deletedAt: null,
  source: 'manual',
  sessionState: null,
  endedBy: null,
  endedDevice: null,
  endRecordedAt: null,
} satisfies BabyEvent;

function connection(overrides: Partial<HomeAssistantData> = {}, billingEnabled = false): Connection {
  return {
    billingEnabled,
    data: {
      babies: vi.fn(async () => [BABY]),
      settings: vi.fn(async () => SETTINGS),
      events: vi.fn(async () => [NAP]),
      running: vi.fn(async () => [NAP]),
      perform: vi.fn(async () => {}),
      ...overrides,
    },
  };
}

const post = (body?: unknown) =>
  new Request('http://localhost/api/ha/v1/babies/baby-1/actions/x', {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe('homeAssistantConfig', () => {
  it('shares only what a client needs to sign in', async () => {
    const response = homeAssistantConfig({
      publicUrl: 'https://babble.example',
      supabaseUrl: 'https://db.babble.example',
      supabaseAnonKey: 'anon',
      billingEnabled: false,
      googleAuthEnabled: false,
      deviceSignInEnabled: true,
      operatorName: null,
      contactEmail: null,
    });
    expect(await response.json()).toEqual({
      public_url: 'https://babble.example',
      supabase_url: 'https://db.babble.example',
      supabase_anon_key: 'anon',
      device_sign_in: true,
    });
  });
});

describe('bearerToken', () => {
  it('reads a bearer authorization header', () => {
    const request = (value?: string) =>
      new Request('http://localhost', { headers: value ? { authorization: value } : {} });
    expect(bearerToken(request('Bearer abc.def'))).toBe('abc.def');
    expect(bearerToken(request('Basic abc'))).toBeNull();
    expect(bearerToken(request())).toBeNull();
  });
});

describe('connect', () => {
  it('needs a token', async () => {
    const response = await connect(new Request('http://localhost'), {});
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(401);
  });
});

describe('listBabies', () => {
  it('lists the babies the account can see', async () => {
    const response = await listBabies(connection());
    expect(await response.json()).toEqual([
      { id: 'baby-1', name: 'Olive', family_id: 'family-1', family_name: 'Brenstrums' },
    ]);
  });
});

describe('babyState', () => {
  it('returns the snapshot for a baby in the family', async () => {
    const live = connection();
    const response = await babyState(live, 'baby-1', NOW);
    const body = (await response.json()) as { sleep: { state: string; asleep_s: number }; predictions: unknown };
    expect(body.sleep).toMatchObject({ state: 'active', asleep_s: 3600 });
    expect(body.predictions).not.toBeNull();
    expect(live.data.events).toHaveBeenCalledWith('baby-1', '2026-09-29T12:00:00Z');
  });

  it('leaves out predictions for a free family when billing is on', async () => {
    const live = connection({}, true);
    const body = (await (await babyState(live, 'baby-1', NOW)).json()) as { predictions: unknown };
    expect(body.predictions).toBeNull();
    expect(live.data.events).toHaveBeenCalledWith('baby-1', '2026-10-05T00:00:00Z');
  });

  it('is not found for a baby outside the family', async () => {
    expect((await babyState(connection(), 'other', NOW)).status).toBe(404);
  });

  it('passes on permission errors', async () => {
    const live = connection({
      settings: async () => {
        throw new BabbleError('nope', 'forbidden');
      },
    });
    expect((await babyState(live, 'baby-1', NOW)).status).toBe(403);
  });
});

describe('runAction', () => {
  it('performs the planned step and returns the new state', async () => {
    const live = connection();
    const response = await runAction(live, 'baby-1', 'pause_sleep', post(), NOW);
    expect(response.status).toBe(200);
    expect(live.data.perform).toHaveBeenCalledWith('baby-1', {
      kind: 'session',
      eventId: 'nap',
      action: { kind: 'pause' },
    });
  });

  it('reports invalid input without touching anything', async () => {
    const live = connection();
    const response = await runAction(live, 'baby-1', 'log_bottle', post({ amount_ml: 'lots' }), NOW);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'amount_ml must be a number.' });
    expect(live.data.perform).not.toHaveBeenCalled();
  });

  it('reports a session that is already running as a conflict', async () => {
    const live = connection({
      perform: async () => {
        throw new BabbleError('busy', 'session_conflict');
      },
    });
    expect((await runAction(live, 'baby-1', 'start_sleep', post(), NOW)).status).toBe(409);
  });
});
