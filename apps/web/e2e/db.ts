import { execFileSync } from 'node:child_process';

// Opens sign-ups so each run can create fresh accounts without invites.
export function setSignupMode(mode: 'open' | 'invite_only'): void {
  execFileSync('docker', [
    'exec',
    'supabase_db_babble',
    'psql',
    '-U',
    'postgres',
    '-c',
    `update private.instance_settings set signup_mode = '${mode}'`,
  ]);
}
