begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

create function pg_temp.sign_in_as(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

update private.instance_settings set signup_mode = 'open';
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('50000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carer@sleep.test', '{}', now(), now()),
  ('50000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'viewer@sleep.test', '{}', now(), now());
insert into public.families (id, name) values ('60000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('60000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000a', 'owner', 'Carer'),
  ('60000000-0000-0000-0000-00000000000a', '50000000-0000-0000-0000-00000000000b', 'viewer', 'Viewer');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('70000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');
insert into public.events (id, baby_id, type, started_at) values
  ('80000000-0000-0000-0000-00000000000a', '70000000-0000-0000-0000-00000000000a', 'sleep', now() - interval '20 minutes');

select pg_temp.sign_in_as('50000000-0000-0000-0000-00000000000a');

select lives_ok(
  $$ select public.save_sleep_details(
       '80000000-0000-0000-0000-00000000000a',
       '{"locations": ["cot"], "fall_asleep": "under_10_min", "notes": " settled quickly "}') $$,
  'details can be saved while a nap is running'
);
select is(
  (select locations::text from public.sleep_details where event_id = '80000000-0000-0000-0000-00000000000a'),
  '{cot}',
  'the details are stored'
);
select is(
  (select row(notes, ended_at is null) from public.events where id = '80000000-0000-0000-0000-00000000000a'),
  row('settled quickly'::text, true),
  'notes are saved and the nap keeps running'
);
select lives_ok(
  $$ select public.save_sleep_details('80000000-0000-0000-0000-00000000000a', '{"start_moods": ["happy"]}') $$,
  'one field can be changed on its own'
);
select is(
  (select row(locations::text, fall_asleep::text, start_moods::text)
   from public.sleep_details where event_id = '80000000-0000-0000-0000-00000000000a'),
  row('{cot}'::text, 'under_10_min'::text, '{happy}'::text),
  'fields that were not sent are left alone'
);
select is(
  (select notes from public.events where id = '80000000-0000-0000-0000-00000000000a'),
  'settled quickly',
  'notes are left alone unless sent'
);

select pg_temp.sign_in_as('50000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$ select public.save_sleep_details('80000000-0000-0000-0000-00000000000a', '{}') $$,
  'P0002',
  'Sleep not found',
  'viewers cannot change sleep details'
);

select * from finish();
rollback;
