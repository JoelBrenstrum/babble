import { execFileSync } from 'node:child_process';

// Opens sign-ups so each run can create fresh accounts without invites.
export function setSignupMode(mode: 'open' | 'invite_only'): void {
  sql(`update private.instance_settings set signup_mode = '${mode}'`);
}

export function joinPlus(email: string): void {
  sql(
    `update public.families set plan = 'plus' where id in (select m.family_id from public.family_members m join auth.users u on u.id = m.user_id where u.email = '${email.replaceAll("'", "''")}')`,
  );
}

function babiesOf(email: string): string {
  return `select b.id from public.babies b join public.family_members m on m.family_id = b.family_id join auth.users u on u.id = m.user_id where u.email = '${email.replaceAll("'", "''")}'`;
}

export function setFeedReminder(email: string, minutes: number): void {
  sql(
    `update public.baby_settings set feed_reminder_enabled = true, feed_reminder_interval_min = ${minutes}, feed_reminder_at_night = true where baby_id in (${babiesOf(email)})`,
  );
}

export function backdateEvents(email: string, minutes: number): void {
  sql(
    `update public.events set started_at = started_at - interval '${minutes} minutes', ended_at = ended_at - interval '${minutes} minutes' where baby_id in (${babiesOf(email)})`,
  );
}

function sql(statement: string): void {
  execFileSync('docker', ['exec', 'supabase_db_babble', 'psql', '-U', 'postgres', '-c', statement]);
}
