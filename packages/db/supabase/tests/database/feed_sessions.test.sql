begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

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
values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'parent@example.com', '{}', now(), now());
insert into public.families (id, name) values ('00000000-0000-0000-0000-0000000000c2', 'Testers');
insert into public.family_members (family_id, user_id, role, display_name)
values ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1', 'owner', 'Parent');
insert into public.babies (id, family_id, name, birth_date, timezone)
values ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c2', 'Baby', '2026-09-26', 'UTC');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000c1');

-- start and end at chosen times
create temp table nap on commit drop as
  select public.start_session('00000000-0000-0000-0000-0000000000c3', 'sleep', 'left', now() - interval '2 hours') as id;
grant select on nap to authenticated;
select ok(
  (select started_at = now() - interval '2 hours' from public.events where id = (select id from nap)),
  'a session can start at an earlier time');
select throws_ok(
  $$ select public.end_session((select id from nap), now() - interval '3 hours') $$,
  '22023', 'A session cannot end before it started', 'a session cannot end before it started');
select lives_ok($$ select public.end_session((select id from nap), now() - interval '30 minutes') $$, 'ends a nap at a chosen time');
select ok(
  (select ended_at = now() - interval '30 minutes' from public.events where id = (select id from nap)),
  'the nap ends at the chosen time');

create temp table future on commit drop as
  select public.start_session('00000000-0000-0000-0000-0000000000c3', 'sleep', 'left', now() + interval '1 hour') as id;
grant select on future to authenticated;
select ok(
  (select started_at <= now() from public.events where id = (select id from future)),
  'a session cannot start in the future');

-- resuming feeds
create temp table feed on commit drop as
  select public.save_event(jsonb_build_object(
    'baby_id', '00000000-0000-0000-0000-0000000000c3', 'type', 'breast_feed',
    'started_at', now() - interval '40 minutes', 'ended_at', now() - interval '20 minutes',
    'segments', jsonb_build_array(
      jsonb_build_object('side', 'left', 'started_at', now() - interval '40 minutes', 'ended_at', now() - interval '30 minutes'),
      jsonb_build_object('side', 'right', 'started_at', now() - interval '30 minutes', 'ended_at', now() - interval '20 minutes')))) as id;
grant select on feed to authenticated;

select lives_ok($$ select public.resume_feed((select id from feed)) $$, 'the latest feed can be resumed');
select is((select ended_at from public.events where id = (select id from feed)), null, 'a resumed feed is running again');
select is(
  (select side::text from public.timed_segments where event_id = (select id from feed) and ended_at is null),
  'right', 'resuming continues on the last side');
select is(
  (select count(*)::int from public.timed_segments where event_id = (select id from feed)),
  3, 'resuming adds a segment, so the gap shows as downtime');
select is((select state::text from public.session_details where event_id = (select id from feed)), 'running', 'the session is running');

select public.end_session((select id from feed));

select public.save_event(jsonb_build_object(
  'baby_id', '00000000-0000-0000-0000-0000000000c3', 'type', 'bottle',
  'started_at', now(), 'ended_at', now(), 'details', jsonb_build_object('amount_ml', 60)));
select throws_ok(
  $$ select public.resume_feed((select id from feed)) $$,
  '22023', 'Only the most recent feed can be resumed', 'an older feed cannot be resumed');

create temp table bottle on commit drop as
  select id from public.events where type = 'bottle' and baby_id = '00000000-0000-0000-0000-0000000000c3';
grant select on bottle to authenticated;
select throws_ok(
  $$ select public.resume_feed((select id from bottle)) $$,
  '22023', 'Only breastfeeds can be resumed', 'bottles cannot be resumed');

update public.events set deleted_at = now() where id = (select id from bottle);
select public.start_session('00000000-0000-0000-0000-0000000000c3', 'breast_feed', 'left');
select throws_ok(
  $$ select public.resume_feed((select id from feed)) $$,
  '22023', 'Another feed is already running', 'a feed cannot be resumed while another is running');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000a9');
select throws_ok(
  $$ select public.resume_feed((select id from feed)) $$,
  'P0002', 'Feed not found', 'strangers cannot resume a feed');

select * from finish();
rollback;
