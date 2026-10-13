import { DAY_MS, HOUR_MS, MINUTE_MS } from '../time/constants';
import { daysUntil } from '../time/instants';

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', caregiver: 'Caregiver', viewer: 'Viewer' };

export function inviteExpiryText(expiresAt: string, now: Date): string {
  const remaining = Date.parse(expiresAt) - now.getTime();
  if (remaining <= 0) return 'Expired';
  if (remaining >= DAY_MS) {
    const days = Math.round(remaining / DAY_MS);
    return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (remaining >= HOUR_MS) return `Expires in ${Math.floor(remaining / HOUR_MS)}h`;
  return `Expires in ${Math.max(1, Math.floor(remaining / MINUTE_MS))}m`;
}

export function pendingInviteMeta(
  invite: { role: string; expiresAt: string; createdBy: string },
  memberNames: ReadonlyMap<string, string>,
  now: Date,
): string {
  const creator = memberNames.get(invite.createdBy) ?? 'a former member';
  return `${ROLE_LABELS[invite.role] ?? invite.role} · by ${creator} · ${inviteExpiryText(invite.expiresAt, now)}`;
}

export function membersHeading(pendingCount: number): string {
  return pendingCount > 0 ? `Members · ${pendingCount} pending` : 'Members';
}

export function inviteLink(publicUrl: string, code: string): string {
  return `${publicUrl}/join/${code}`;
}

export function formatExpiry(expiresAt: string, now: Date): string {
  const days = Math.max(1, daysUntil(expiresAt, now));
  return `Expires in ${days} ${days === 1 ? 'day' : 'days'} · one use`;
}
