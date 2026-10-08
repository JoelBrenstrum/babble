begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

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
  ('51000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'jane@ended.test', '{}', now(), now()),
  ('51000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'john@ended.test', '{}', now(), now());
insert into public.families (id, name) values ('61000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('61000000-0000-0000-0000-00000000000a', '51000000-0000-0000-0000-00000000000a', 'owner', 'Jane'),
  ('61000000-0000-0000-0000-00000000000a', '51000000-0000-0000-0000-00000000000b', 'caregiver', 'John');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('71000000-0000-0000-0000-00000000000a', '61000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');
insert into public.events (id, baby_id, type, started_at) values
  ('81000000-0000-0000-0000-00000000000a', '71000000-0000-0000-0000-00000000000a', 'sleep', now() - interval '40 minutes');
insert into public.session_details (event_id) values ('81000000-0000-0000-0000-00000000000a');

select pg_temp.sign_in_as('51000000-0000-0000-0000-00000000000b');
select public.end_session('81000000-0000-0000-0000-00000000000a', now() - interval '10 minutes');

select is(
  (select ended_by from public.events where id = '81000000-0000-0000-0000-00000000000a'),
  '51000000-0000-0000-0000-00000000000b'::uuid,
  'ending a nap records who ended it'
);
select ok(
  (select end_recorded_at = now() and ended_at = now() - interval '10 minutes'
   from public.events where id = '81000000-0000-0000-0000-00000000000a'),
  'the time Stop was pressed is kept apart from the backdated end'
);

select pg_temp.sign_in_as('51000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ update public.events set ended_by = null where id = '81000000-0000-0000-0000-00000000000a' $$,
  '42501',
  null,
  'clients cannot change who ended an entry'
);
update public.events set ended_at = now() - interval '5 minutes' where id = '81000000-0000-0000-0000-00000000000a';

select is(
  (select ended_by from public.events where id = '81000000-0000-0000-0000-00000000000a'),
  '51000000-0000-0000-0000-00000000000b'::uuid,
  'editing the end later keeps who ended it'
);

update public.events set ended_at = null where id = '81000000-0000-0000-0000-00000000000a';
select ok(
  (select ended_by is null and end_recorded_at is null from public.events where id = '81000000-0000-0000-0000-00000000000a'),
  'reopening an entry clears who ended it'
);

insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('81000000-0000-0000-0000-00000000000b', '71000000-0000-0000-0000-00000000000a', 'sleep',
   now() - interval '3 hours', now() - interval '2 hours');
select ok(
  (select ended_by is null and end_recorded_at is null from public.events where id = '81000000-0000-0000-0000-00000000000b'),
  'a nap logged after the fact has no recorded end'
);

select * from finish();
rollback;
