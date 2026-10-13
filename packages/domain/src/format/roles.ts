export type MemberRole = 'owner' | 'caregiver' | 'viewer';

export const MEMBER_ROLES: readonly MemberRole[] = ['owner', 'caregiver', 'viewer'];

const ROLE_LABELS: Record<MemberRole, string> = { owner: 'Admin', caregiver: 'Caregiver', viewer: 'Read only' };

const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner: 'Logs entries, changes settings and manages who has access',
  caregiver: 'Logs and edits entries, but can’t change settings',
  viewer: 'Sees entries, the timeline and stats, but can’t change anything',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as MemberRole] ?? role;
}

export function roleDescription(role: MemberRole): string {
  return ROLE_DESCRIPTIONS[role];
}

export function settingsLockedNote(role: MemberRole | null): string | null {
  if (role === 'owner') return null;
  return role === 'viewer'
    ? 'You have read-only access. Ask an admin to change these settings.'
    : 'Only admins can change these settings. Ask an admin if something needs changing.';
}

export const READ_ONLY_NOTE = 'You have read-only access, so you can see entries but not change them.';
