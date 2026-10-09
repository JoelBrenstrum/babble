begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

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
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'switcher@example.com', '{}', now(), now());
insert into public.families (id, name) values ('00000000-0000-0000-0000-0000000000f2', 'Switchers');
insert into public.family_members (family_id, user_id, role, display_name)
values ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1', 'owner', 'Parent');
insert into public.babies (id, family_id, name, birth_date, timezone)
values ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000f2', 'Baby', '2026-09-26', 'UTC');

insert into public.events (id, baby_id, type, started_at, ended_at)
values ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000f3', 'breast_feed',
        now() - interval '30 minutes', null);
insert into public.session_details (event_id, state) values ('00000000-0000-0000-0000-0000000000f4', 'running');
insert into public.timed_segments (event_id, side, started_at, ended_at) values
  ('00000000-0000-0000-0000-0000000000f4', 'left', now() - interval '30 minutes', now() - interval '20 minutes'),
  ('00000000-0000-0000-0000-0000000000f4', 'right', now() - interval '5 minutes', null);

insert into public.events (id, baby_id, type, started_at, ended_at)
values ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000f3', 'pump',
        now() - interval '30 minutes', null);
insert into public.session_details (event_id, state) values ('00000000-0000-0000-0000-0000000000f5', 'running');
insert into public.timed_segments (event_id, side, started_at, ended_at) values
  ('00000000-0000-0000-0000-0000000000f5', 'left', now() - interval '30 minutes', now() - interval '2 minutes'),
  ('00000000-0000-0000-0000-0000000000f5', 'right', now() - interval '2 minutes', null);

insert into public.events (id, baby_id, type, started_at, ended_at)
values ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000f3', 'sleep',
        now() - interval '60 minutes', null);
insert into public.session_details (event_id, state) values ('00000000-0000-0000-0000-0000000000f6', 'running');
insert into public.timed_segments (event_id, side, started_at, ended_at) values
  ('00000000-0000-0000-0000-0000000000f6', null, now() - interval '60 minutes', now() - interval '30 minutes'),
  ('00000000-0000-0000-0000-0000000000f6', null, now() - interval '20 minutes', null);

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000f1');

select lives_ok(
  $$ select public.set_switch_time('00000000-0000-0000-0000-0000000000f6', now() - interval '21 minutes') $$,
  'awake time can be taken off a live nap');
select ok(
  (select count(*) = 1 from public.timed_segments
   where event_id = '00000000-0000-0000-0000-0000000000f6' and started_at = now() - interval '21 minutes'),
  'sleep resumes a minute earlier');

select lives_ok(
  $$ select public.set_switch_time('00000000-0000-0000-0000-0000000000f4', now() - interval '18 minutes') $$,
  'a forgotten switch after a pause can be moved earlier');
select ok(
  (select started_at = now() - interval '18 minutes' from public.timed_segments
   where event_id = '00000000-0000-0000-0000-0000000000f4' and side = 'right'),
  'the second side starts earlier');
select ok(
  (select ended_at = now() - interval '20 minutes' from public.timed_segments
   where event_id = '00000000-0000-0000-0000-0000000000f4' and side = 'left'),
  'the first side keeps its end, so only 2 minutes of idle are left');

select lives_ok(
  $$ select public.set_switch_time('00000000-0000-0000-0000-0000000000f5', now() - interval '12 minutes') $$,
  'a switch that was tapped late on a pump can be moved earlier');
select ok(
  (select bool_and(case side when 'left' then ended_at else started_at end = now() - interval '12 minutes')
   from public.timed_segments where event_id = '00000000-0000-0000-0000-0000000000f5'),
  'the first side ends when the second one starts');

select throws_ok(
  $$ select public.set_switch_time('00000000-0000-0000-0000-0000000000f5', now() - interval '40 minutes') $$,
  '22023', 'The switch must be after the previous side started', 'the switch stays after the first side started');
select throws_ok(
  $$ select public.set_switch_time('00000000-0000-0000-0000-0000000000f5', now() - interval '1 minute') $$,
  '22023', 'Pick a time before the switch', 'only earlier switches are allowed');
select throws_ok(
  $$ select public.set_switch_time('00000000-0000-0000-0000-0000000000f5', now() + interval '1 minute') $$,
  '22023', 'The switch can''t be in the future', 'the switch can''t be in the future');

select set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
select throws_ok(
  $$ select public.set_switch_time('00000000-0000-0000-0000-0000000000f4', now() - interval '19 minutes') $$,
  'P0002', 'Session not found', 'other people can''t move the switch');

select * from finish();
rollback;
