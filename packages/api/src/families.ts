import type { BabbleClient } from './client';
import { BabbleError, toBabbleError, unwrap } from './errors';
import { normalizeInviteCode } from './invite-code';
import type {
  BabyRow,
  BabySettingsRow,
  BabySettingsUpdate,
  Family,
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
      .select('*, members:family_members(*), babies(*)')
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

export async function addBaby(client: BabbleClient, baby: NewBaby): Promise<BabyRow> {
  return unwrap(
    await client
      .from('babies')
      .insert({
        family_id: baby.familyId,
        name: baby.name.trim(),
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
  return unwrap(await client.from('babies').update(patch).eq('id', babyId).select().single());
}

export async function getBabySettings(client: BabbleClient, babyId: string): Promise<BabySettingsRow> {
  return unwrap(await client.from('baby_settings').select('*').eq('baby_id', babyId).single());
}

export async function updateBabySettings(
  client: BabbleClient,
  babyId: string,
  patch: Omit<BabySettingsUpdate, 'baby_id' | 'updated_at'>,
): Promise<BabySettingsRow> {
  return unwrap(await client.from('baby_settings').update(patch).eq('baby_id', babyId).select().single());
}

export async function createInvite(
  client: BabbleClient,
  familyId: string,
  role: Exclude<FamilyRole, 'owner'> = 'caregiver',
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
  const { error } = await client.from('family_invites').delete().eq('id', inviteId);
  if (error) throw toBabbleError(error);
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
  const { error } = await client.rpc('delete_my_account');
  if (error) throw toBabbleError(error);
  await client.auth.signOut({ scope: 'local' });
}
