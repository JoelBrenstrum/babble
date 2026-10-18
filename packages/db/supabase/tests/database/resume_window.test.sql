begin;
create extension if not exists pgtap with schema extensions;

select plan(13);
update private.instance_settings set billing_enabled = false;

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
  ('55000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carer@resume.test', '{}', now(), now());
insert into public.families (id, name) values ('65000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('65000000-0000-0000-0000-00000000000a', '55000000-0000-0000-0000-00000000000a', 'owner', 'Carer');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('75000000-0000-0000-0000-00000000000a', '65000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');

insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('85000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-00000000000a', 'breast_feed',
   now() - interval '50 minutes', now() - interval '25 minutes'),
  ('85000000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-00000000000a', 'sleep',
   now() - interval '3 hours', now() - interval '150 minutes'),
  ('85000000-0000-0000-0000-000000000003', '75000000-0000-0000-0000-00000000000a', 'sleep',
   now() - interval '90 minutes', now() - interval '15 minutes');
insert into public.timed_segments (event_id, side, started_at, ended_at) values
  ('85000000-0000-0000-0000-000000000001', 'left', now() - interval '50 minutes', now() - interval '25 minutes');

select pg_temp.sign_in_as('55000000-0000-0000-0000-00000000000a');

select throws_ok(
  $$ select public.resume_feed('85000000-0000-0000-0000-000000000001') $$,
  '22023', 'A feed can only be resumed within 20 minutes of it ending',
  'a feed that ended more than 20 minutes ago cannot be resumed');

select throws_ok(
  $$ select public.resume_sleep('85000000-0000-0000-0000-000000000002') $$,
  '22023', 'A sleep can only be resumed within 20 minutes of it ending',
  'a sleep that ended more than 20 minutes ago cannot be resumed');

select throws_ok(
  $$ select public.resume_sleep('85000000-0000-0000-0000-000000000001') $$,
  '22023', 'Only sleeps can be resumed here',
  'resume_sleep only resumes sleeps');

select lives_ok(
  $$ select public.resume_sleep('85000000-0000-0000-0000-000000000003') $$,
  'the latest sleep can be resumed within 20 minutes of it ending');
select is(
  (select ended_at from public.events where id = '85000000-0000-0000-0000-000000000003'),
  null, 'a resumed sleep is running again');
select is(
  (select state::text from public.session_details where event_id = '85000000-0000-0000-0000-000000000003'),
  'running', 'a resumed sleep is marked running');
select results_eq(
  $$ select started_at, ended_at from public.timed_segments
     where event_id = '85000000-0000-0000-0000-000000000003' order by started_at $$,
  $$ values (now() - interval '90 minutes', now() - interval '15 minutes'), (now(), null::timestamptz) $$,
  'resuming keeps the sleep so far and starts a new stretch, so the gap shows as awake');

select public.end_session('85000000-0000-0000-0000-000000000003', now());
select lives_ok(
  $$ select public.resume_sleep('85000000-0000-0000-0000-000000000003') $$,
  'a resumed sleep can be ended and resumed again');
select is(
  (select count(*)::int from public.timed_segments where event_id = '85000000-0000-0000-0000-000000000003'),
  3, 'a sleep with stretches gains another stretch');

select lives_ok(
  $$ select public.resume_sleep('85000000-0000-0000-0000-000000000003') $$,
  'resuming a running sleep does nothing');
select is(
  (select count(*)::int from public.timed_segments where event_id = '85000000-0000-0000-0000-000000000003'),
  3, 'a running sleep is left as it was');

select public.end_session('85000000-0000-0000-0000-000000000003', now());
create temporary table other on commit drop as
  select public.start_session('75000000-0000-0000-0000-00000000000a', 'sleep', null, now()) as id;
select throws_ok(
  $$ select public.resume_sleep('85000000-0000-0000-0000-000000000003') $$,
  '22023', 'Another sleep is already running',
  'a sleep cannot be resumed while another is running');

select public.end_session((select id from other), now());
select throws_ok(
  $$ select public.resume_sleep('85000000-0000-0000-0000-000000000003') $$,
  '22023', 'Only the most recent sleep can be resumed',
  'an older sleep cannot be resumed');

select * from finish();
rollback;
