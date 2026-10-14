import type { BabbleClient } from './client';
import { BabbleError, unwrap, unwrapMaybe, unwrapVoid } from './errors';
import { normalizeInviteCode } from './invite-code';
import type {
  BabyRow,
  BabySettings,
  BabySettingsRow,
  BabySettingsUpdate,
  Family,
  FamilySettings,
  FamilySettingsRow,
  FamilyRole,
  InstanceSettings,
  Invite,
  InvitePreview,
  NewBaby,
  PendingInvite,
} from './types';

export async function getInstanceSettings(client: BabbleClient): Promise<InstanceSettings> {
  const [row] = unwrap(await client.rpc('get_instance_settings'));
  if (!row) throw new BabbleError('Server settings are missing', 'unknown');
  return { signupMode: row.signup_mode, hasUsers: row.has_users };
}

export async function checkInvite(client: BabbleClient, code: string): Promise<InvitePreview | null> {
  const [row] = unwrap(await client.rpc('check_invite', { invite_code: normalizeInviteCode(code) }));
  return row ? { familyName: row.family_name, expiresAt: row.expires_at } : null;
}

export async function listFamilies(client: BabbleClient): Promise<Family[]> {
  const rows = unwrap(
    await client
      .from('families')
      .select('*, members:family_members(*), former_members(*), babies(*)')
      .order('created_at')
      .order('created_at', { referencedTable: 'babies' }),
  );
  return rows;
}

export async function createFamily(
  client: BabbleClient,
  options: { familyName: string; displayName: string },
): Promise<string> {
  return unwrap(
    await client.rpc('create_family', {
      family_name: options.familyName.trim(),
      display_name: options.displayName.trim(),
    }),
  );
}

export const MAX_BABY_NAME_LENGTH = 60;

export function babyNameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Enter your baby's name.";
  if (trimmed.length > MAX_BABY_NAME_LENGTH) return `Use ${MAX_BABY_NAME_LENGTH} characters or fewer for the name.`;
  return null;
}

export function validBabyName(name: string): string {
  const error = babyNameError(name);
  if (error) throw new BabbleError(error, 'invalid_input');
  return name.trim();
}

export async function addBaby(client: BabbleClient, baby: NewBaby): Promise<BabyRow> {
  const name = validBabyName(baby.name);
  return unwrap(
    await client
      .from('babies')
      .insert({
        family_id: baby.familyId,
        name,
        birth_date: baby.birthDate,
        timezone: baby.timezone,
        day_start_minutes: baby.dayStartMinutes,
        sex: baby.sex ?? null,
      })
      .select()
      .single(),
  );
}

export async function updateBaby(
  client: BabbleClient,
  babyId: string,
  patch: Partial<Pick<BabyRow, 'name' | 'birth_date' | 'timezone' | 'day_start_minutes' | 'sex'>>,
): Promise<BabyRow> {
  const normalized = patch.name === undefined ? patch : { ...patch, name: validBabyName(patch.name) };
  return unwrap(await client.from('babies').update(normalized).eq('id', babyId).select().single());
}

const BABY_SETTINGS_WITH_FAMILY = '*, babies(families(family_settings(*)))';

type BabySettingsWithFamily = BabySettingsRow & {
  babies: { families: { family_settings: FamilySettingsRow | null } | null } | null;
};

export const DEFAULT_FAMILY_SETTINGS: FamilySettings = {
  units: 'metric',
  downtime_merge_threshold_sec: 15,
  auto_end_paused_session_min: 30,
};

export function withFamilySettings(row: BabySettingsWithFamily): BabySettings {
  const { babies, ...settings } = row;
  const family = babies?.families?.family_settings ?? DEFAULT_FAMILY_SETTINGS;
  return {
    ...settings,
    units: family.units,
    downtime_merge_threshold_sec: family.downtime_merge_threshold_sec,
    auto_end_paused_session_min: family.auto_end_paused_session_min,
  };
}

export async function getBabySettings(client: BabbleClient, babyId: string): Promise<BabySettings> {
  return withFamilySettings(
    unwrap(await client.from('baby_settings').select(BABY_SETTINGS_WITH_FAMILY).eq('baby_id', babyId).single()),
  );
}

export async function findBabySettings(client: BabbleClient, babyId: string): Promise<BabySettings | null> {
  const row = unwrapMaybe(
    await client.from('baby_settings').select(BABY_SETTINGS_WITH_FAMILY).eq('baby_id', babyId).maybeSingle(),
  );
  return row && withFamilySettings(row);
}

export async function updateBabySettings(
  client: BabbleClient,
  babyId: string,
  patch: BabySettingsUpdate,
): Promise<BabySettings> {
  return withFamilySettings(
    unwrap(
      await client.from('baby_settings').update(patch).eq('baby_id', babyId).select(BABY_SETTINGS_WITH_FAMILY).single(),
    ),
  );
}

export async function updateFamilySettings(
  client: BabbleClient,
  familyId: string,
  patch: Partial<FamilySettings>,
): Promise<FamilySettingsRow> {
  return unwrap(await client.from('family_settings').update(patch).eq('family_id', familyId).select().single());
}

export async function createInvite(
  client: BabbleClient,
  familyId: string,
  role: FamilyRole = 'caregiver',
): Promise<Invite> {
  const [row] = unwrap(await client.rpc('create_invite', { target_family_id: familyId, invite_role: role }));
  if (!row) throw new BabbleError('The invite was not created', 'unknown');
  return { code: row.code, expiresAt: row.expires_at };
}

export async function listPendingInvites(
  client: BabbleClient,
  familyId: string,
  now: Date = new Date(),
): Promise<PendingInvite[]> {
  const rows = unwrap(
    await client
      .from('family_invites')
      .select('id, code, role, created_by, created_at, expires_at')
      .eq('family_id', familyId)
      .is('used_at', null)
      .gt('expires_at', now.toISOString())
      .order('created_at', { ascending: false }),
  );
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    role: row.role,
    createdBy: row.created_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }));
}

export async function revokeInvite(client: BabbleClient, inviteId: string): Promise<void> {
  unwrapVoid(await client.from('family_invites').delete().eq('id', inviteId));
}

export async function renameMember(
  client: BabbleClient,
  member: { familyId: string; userId: string },
  displayName: string,
): Promise<void> {
  unwrapVoid(
    await client
      .from('family_members')
      .update({ display_name: displayName.trim() })
      .eq('family_id', member.familyId)
      .eq('user_id', member.userId),
  );
}

export async function setMemberRole(
  client: BabbleClient,
  member: { familyId: string; userId: string },
  role: FamilyRole,
): Promise<void> {
  unwrapVoid(
    await client.rpc('set_member_role', {
      target_family_id: member.familyId,
      member_user_id: member.userId,
      new_role: role,
    }),
  );
}

export async function removeMember(client: BabbleClient, member: { familyId: string; userId: string }): Promise<void> {
  unwrapVoid(
    await client.from('family_members').delete().eq('family_id', member.familyId).eq('user_id', member.userId),
  );
}

export async function acceptInvite(
  client: BabbleClient,
  options: { code: string; displayName: string },
): Promise<string> {
  return unwrap(
    await client.rpc('accept_invite', {
      invite_code: normalizeInviteCode(options.code),
      display_name: options.displayName.trim(),
    }),
  );
}

export async function deleteMyAccount(client: BabbleClient): Promise<void> {
  unwrapVoid(await client.rpc('delete_my_account'));
  await client.auth.signOut({ scope: 'local' });
}
