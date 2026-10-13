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

function sql(statement: string): void {
  execFileSync('docker', ['exec', 'supabase_db_babble', 'psql', '-U', 'postgres', '-c', statement]);
}
