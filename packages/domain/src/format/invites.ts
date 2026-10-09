const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', caregiver: 'Caregiver', viewer: 'Viewer' };

export function inviteExpiryText(expiresAt: string, now: Date): string {
  const remaining = Date.parse(expiresAt) - now.getTime();
  if (remaining <= 0) return 'Expired';
  if (remaining >= DAY_MS) {
    const days = Math.round(remaining / DAY_MS);
    return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (remaining >= HOUR_MS) return `Expires in ${Math.floor(remaining / HOUR_MS)}h`;
  return `Expires in ${Math.max(1, Math.floor(remaining / 60_000))}m`;
}

export function pendingInviteMeta(
  invite: { role: string; expiresAt: string; createdBy: string },
  memberNames: ReadonlyMap<string, string>,
  now: Date,
): string {
  const creator = memberNames.get(invite.createdBy) ?? 'a former member';
  return `${ROLE_LABELS[invite.role] ?? invite.role} · by ${creator} · ${inviteExpiryText(invite.expiresAt, now)}`;
}

export function caregiversHeading(pendingCount: number): string {
  return pendingCount > 0 ? `Caregivers · ${pendingCount} pending` : 'Caregivers';
}
