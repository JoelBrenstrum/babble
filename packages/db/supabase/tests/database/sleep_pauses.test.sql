begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

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
  ('52000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carer@pauses.test', '{}', now(), now());
insert into public.families (id, name) values ('62000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('62000000-0000-0000-0000-00000000000a', '52000000-0000-0000-0000-00000000000a', 'owner', 'Carer');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('72000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');

select pg_temp.sign_in_as('52000000-0000-0000-0000-00000000000a');
create temporary table nap on commit drop as
  select public.start_session('72000000-0000-0000-0000-00000000000a', 'sleep', null, now() - interval '30 minutes') as id;

select is(
  (select count(*)::int from public.timed_segments where event_id = (select id from nap)),
  0,
  'a nap that has never been paused has no segments'
);

select public.pause_session((select id from nap));
select is(
  (select state::text from public.session_details where event_id = (select id from nap)),
  'paused',
  'pausing a nap marks it paused'
);
select ok(
  (select started_at = now() - interval '30 minutes' and ended_at = now() and side is null
   from public.timed_segments where event_id = (select id from nap)),
  'the first pause records the sleep so far as one stretch with no side'
);

select public.resume_session((select id from nap), 'right');
select ok(
  (select side is null and ended_at is null from public.timed_segments
   where event_id = (select id from nap) order by started_at desc limit 1),
  'resuming opens a new stretch of sleep, still with no side'
);
select is(
  (select state::text from public.session_details where event_id = (select id from nap)),
  'running',
  'resuming marks the nap running'
);
select throws_ok(
  $$ select public.switch_side((select id from nap), 'left') $$,
  '22023',
  'Naps don''t have sides',
  'naps cannot switch sides'
);

select public.pause_session((select id from nap));
select public.end_session((select id from nap), now());
select ok(
  (select ended_at = (select max(ended_at) from public.timed_segments where event_id = (select id from nap))
   from public.events where id = (select id from nap)),
  'a nap stopped while paused ends at the moment it was paused'
);

create temporary table plain on commit drop as
  select public.start_session('72000000-0000-0000-0000-00000000000a', 'sleep', null, now() - interval '20 minutes') as id;
select public.end_session((select id from plain), now() - interval '5 minutes');
select ok(
  (select ended_at = now() - interval '5 minutes' from public.events where id = (select id from plain)),
  'a nap that was never paused still ends at the chosen time'
);

select public.save_event(jsonb_build_object(
  'id', (select id from nap),
  'baby_id', '72000000-0000-0000-0000-00000000000a',
  'type', 'sleep',
  'started_at', now() - interval '25 minutes',
  'ended_at', now(),
  'details', '{}'::jsonb,
  'segments', jsonb_build_array(
    jsonb_build_object('side', null, 'started_at', now() - interval '25 minutes', 'ended_at', now() - interval '10 minutes'),
    jsonb_build_object('side', null, 'started_at', now() - interval '5 minutes', 'ended_at', now())
  )
));
select is(
  (select count(*)::int from public.timed_segments where event_id = (select id from nap) and side is null),
  2,
  'editing a nap saves its stretches of sleep'
);

select * from finish();
rollback;
