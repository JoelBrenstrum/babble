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

export function seedReportEvents(email: string): void {
  const user = `(select u.id from auth.users u where u.email = '${email.replaceAll("'", "''")}')`;
  const baby = `(${babiesOf(email)} limit 1)`;
  sql(`
    with days as (select generate_series(1, 5) as back),
    sleeps as (
      insert into public.events (baby_id, type, started_at, ended_at, created_by)
      select ${baby}, 'sleep', date_trunc('day', now()) - (back || ' days')::interval + interval '20 hours',
             date_trunc('day', now()) - (back || ' days')::interval + interval '26 hours', ${user} from days
      returning id, started_at
    ),
    naps as (
      insert into public.events (baby_id, type, started_at, ended_at, created_by)
      select ${baby}, 'sleep', date_trunc('day', now()) - (back || ' days')::interval + interval '10 hours',
             date_trunc('day', now()) - (back || ' days')::interval + interval '11 hours 30 minutes', ${user} from days
      returning id
    ),
    bottles as (
      insert into public.events (baby_id, type, started_at, ended_at, created_by)
      select ${baby}, 'bottle', date_trunc('day', now()) - (back || ' days')::interval + (hour || ' hours')::interval,
             date_trunc('day', now()) - (back || ' days')::interval + (hour || ' hours')::interval, ${user}
      from days cross join (values (7), (11), (15), (19)) as h(hour)
      returning id
    ),
    nappies as (
      insert into public.events (baby_id, type, started_at, ended_at, created_by)
      select ${baby}, 'nappy', date_trunc('day', now()) - (back || ' days')::interval + (hour || ' hours')::interval,
             date_trunc('day', now()) - (back || ' days')::interval + (hour || ' hours')::interval, ${user}
      from days cross join (values (8), (14)) as h(hour)
      returning id
    ),
    sleep_rows as (
      insert into public.sleep_details (event_id, locations) select id, array['cot']::public.sleep_location[] from sleeps
      union all select id, array['pram']::public.sleep_location[] from naps
      returning event_id
    ),
    bottle_rows as (
      insert into public.bottle_details (event_id, content, amount_ml) select id, 'formula', 90 from bottles returning event_id
    )
    insert into public.nappy_details (event_id, wet, dirty) select id, true, false from nappies;
  `);
}
