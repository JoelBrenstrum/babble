begin;
create extension if not exists pgtap with schema extensions;

select plan(40);

create function pg_temp.sign_in_as(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function pg_temp.sign_out()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end;
$$;

update private.instance_settings set signup_mode = 'open';
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'john@example.com', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jane@example.com', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gran@example.com', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger@example.com', '{}', now(), now());

insert into public.families (id, name) values
  ('00000000-0000-0000-0000-0000000000f1', 'The Smiths'),
  ('00000000-0000-0000-0000-0000000000f2', 'Strangers');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'owner', 'John'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'caregiver', 'Jane'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'viewer', 'Gran'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a4', 'owner', 'Stranger');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'Olivia', '2026-09-26', 'Pacific/Auckland');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000a1');

-- save_event for each detail type
select lives_ok($$
  select public.save_event(jsonb_build_object(
    'id', '00000000-0000-0000-0000-0000000000e1', 'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'sleep',
    'started_at', '2026-10-06T01:00:00Z', 'ended_at', '2026-10-06T03:00:00Z', 'notes', '  Good nap  ',
    'details', jsonb_build_object('locations', jsonb_build_array('cot', 'held'), 'fall_asleep', 'under_10_min',
      'start_moods', jsonb_build_array('happy'), 'end_moods', '[]'::jsonb, 'woken_by_carer', true)))
$$, 'saves a sleep with details');
select is((select notes from public.events where id = '00000000-0000-0000-0000-0000000000e1'), 'Good nap', 'notes are trimmed');
select is(
  (select locations::text from public.sleep_details where event_id = '00000000-0000-0000-0000-0000000000e1'),
  '{cot,held}', 'sleep locations are saved');
select is(
  (select created_by from public.events where id = '00000000-0000-0000-0000-0000000000e1'),
  '00000000-0000-0000-0000-0000000000a1'::uuid, 'the author is the signed-in user');

select lives_ok($$
  select public.save_event(jsonb_build_object(
    'id', '00000000-0000-0000-0000-0000000000e2', 'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'nappy',
    'started_at', '2026-10-06T04:00:00Z', 'ended_at', '2026-10-06T04:00:00Z',
    'details', jsonb_build_object('wet', true, 'dirty', true, 'wet_size', 'medium', 'poo_size', 'large',
      'poo_colours', jsonb_build_array('mustard', 'green'), 'poo_textures', jsonb_build_array('seedy', 'pasty'), 'rash', false)))
$$, 'saves a nappy with two colours');
select is(
  (select poo_colours::text from public.nappy_details where event_id = '00000000-0000-0000-0000-0000000000e2'),
  '{mustard,green}', 'poo colours keep their order');
select throws_ok($$
  select public.save_event(jsonb_build_object(
    'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'nappy',
    'started_at', '2026-10-06T05:00:00Z', 'ended_at', '2026-10-06T05:00:00Z',
    'details', jsonb_build_object('dirty', true, 'poo_colours', jsonb_build_array('yellow', 'green', 'brown'))))
$$, '23514', null, 'a nappy cannot have three poo colours');

select lives_ok($$
  select public.save_event(jsonb_build_object(
    'id', '00000000-0000-0000-0000-0000000000e3', 'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'bottle',
    'started_at', '2026-10-06T06:00:00Z', 'ended_at', '2026-10-06T06:15:00Z',
    'details', jsonb_build_object('content', 'formula', 'amount_ml', 120, 'amount_left_ml', 15)))
$$, 'saves a bottle');
select is((select amount_ml from public.bottle_details where event_id = '00000000-0000-0000-0000-0000000000e3'), 120, 'bottle amount is saved');

select lives_ok($$
  select public.save_event(jsonb_build_object(
    'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'growth',
    'started_at', '2026-10-06T07:00:00Z', 'ended_at', '2026-10-06T07:00:00Z',
    'details', jsonb_build_object('weight_g', 3950)))
$$, 'saves a growth entry with only a weight');
select throws_ok($$
  select public.save_event(jsonb_build_object(
    'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'growth',
    'started_at', '2026-10-06T07:00:00Z', 'ended_at', '2026-10-06T07:00:00Z', 'details', '{}'::jsonb))
$$, '23514', null, 'a growth entry needs at least one measurement');

select lives_ok($$
  select public.save_event(jsonb_build_object(
    'id', '00000000-0000-0000-0000-0000000000e4', 'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'custom',
    'started_at', '2026-10-06T08:00:00Z', 'ended_at', '2026-10-06T08:15:00Z',
    'details', jsonb_build_object('title', ' Bath ', 'description', 'Lavender')))
$$, 'saves a custom event');
select is((select title from public.custom_details where event_id = '00000000-0000-0000-0000-0000000000e4'), 'Bath', 'custom titles are trimmed');

select lives_ok($$
  select public.save_event(jsonb_build_object(
    'id', '00000000-0000-0000-0000-0000000000e5', 'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'pump',
    'started_at', '2026-10-06T09:00:00Z', 'ended_at', '2026-10-06T09:20:00Z',
    'details', jsonb_build_object('left_ml', 60, 'right_ml', 50),
    'segments', jsonb_build_array(
      jsonb_build_object('side', 'left', 'started_at', '2026-10-06T09:00:00Z', 'ended_at', '2026-10-06T09:09:00Z'),
      jsonb_build_object('side', 'right', 'started_at', '2026-10-06T09:10:00Z', 'ended_at', '2026-10-06T09:20:00Z'))))
$$, 'saves a manual pump with segments');
select is((select count(*)::int from public.timed_segments where event_id = '00000000-0000-0000-0000-0000000000e5'), 2, 'pump segments are saved');
select is((select state::text from public.session_details where event_id = '00000000-0000-0000-0000-0000000000e5'), 'ended', 'a finished manual pump is ended');

-- updates
select lives_ok($$
  select public.save_event(jsonb_build_object(
    'id', '00000000-0000-0000-0000-0000000000e3', 'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'bottle',
    'started_at', '2026-10-06T06:00:00Z', 'ended_at', '2026-10-06T06:20:00Z',
    'details', jsonb_build_object('content', 'breast_milk', 'amount_ml', 90)))
$$, 'updates an existing bottle');
select is(
  (select content::text || ' ' || amount_ml from public.bottle_details where event_id = '00000000-0000-0000-0000-0000000000e3'),
  'breast_milk 90', 'the update replaced the details');
select throws_ok($$
  select public.save_event(jsonb_build_object(
    'id', '00000000-0000-0000-0000-0000000000e3', 'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'sleep',
    'started_at', '2026-10-06T06:00:00Z', 'ended_at', '2026-10-06T06:20:00Z'))
$$, '22023', 'An event''s type cannot change', 'an event''s type cannot change');

-- breastfeed sessions
create temp table feed on commit drop as
  select public.start_session('00000000-0000-0000-0000-0000000000b1', 'breast_feed', 'left') as id;
grant select on feed to authenticated;
select is(
  (select count(*)::int from public.timed_segments where event_id = (select id from feed) and side = 'left' and ended_at is null),
  1, 'starting a feed opens a left segment');
select is(
  public.start_session('00000000-0000-0000-0000-0000000000b1', 'breast_feed', 'right'),
  (select id from feed), 'starting a second feed returns the running one');
select isnt(
  public.start_session('00000000-0000-0000-0000-0000000000b1', 'sleep'),
  (select id from feed), 'a sleep can run at the same time as a feed');

select lives_ok($$ select public.switch_side((select id from feed), 'right') $$, 'switches side');
select is(
  (select string_agg(side::text || ':' || (ended_at is null)::text, ',' order by started_at, side)
   from public.timed_segments where event_id = (select id from feed)),
  'left:false,right:true', 'switching closes the left segment and opens a right one');
select lives_ok($$ select public.switch_side((select id from feed), 'right') $$, 'switching to the current side is harmless');
select is((select count(*)::int from public.timed_segments where event_id = (select id from feed)), 2, 'no extra segment is added');

select lives_ok($$ select public.pause_session((select id from feed)) $$, 'pauses');
select is((select state::text from public.session_details where event_id = (select id from feed)), 'paused', 'the session is paused');
select is((select count(*)::int from public.timed_segments where event_id = (select id from feed) and ended_at is null), 0, 'pausing closes the open segment');

select lives_ok($$ select public.resume_session((select id from feed)) $$, 'resumes');
select is(
  (select side::text from public.timed_segments where event_id = (select id from feed) and ended_at is null),
  'right', 'resuming continues on the last side');

select lives_ok($$ select public.end_session((select id from feed)) $$, 'finishes');
select ok(
  (select e.ended_at = (select max(s.ended_at) from public.timed_segments s where s.event_id = e.id)
   from public.events e where e.id = (select id from feed)),
  'a finished feed ends when its last segment ends');
select throws_ok($$ select public.switch_side((select id from feed), 'left') $$, '22023', 'This session has already finished',
  'a finished feed cannot switch sides');

-- soft delete and latest events
update public.events set deleted_at = now() where id = '00000000-0000-0000-0000-0000000000e2';
select is(
  (select count(*)::int from public.latest_events('00000000-0000-0000-0000-0000000000b1') where type = 'nappy'),
  0, 'deleted events are not the latest');
select is(
  (select count(*)::int from public.latest_events('00000000-0000-0000-0000-0000000000b1')),
  6, 'latest_events returns one event per logged type');

-- permissions
select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000a2');
select lives_ok(
  $$ select public.start_session('00000000-0000-0000-0000-0000000000b1', 'pump', 'right') $$,
  'caregivers can start sessions');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
  $$ select public.save_event(jsonb_build_object('baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'nappy',
       'started_at', now(), 'ended_at', now(), 'details', jsonb_build_object('wet', true))) $$,
  '42501', null, 'viewers cannot log events');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.events), 0, 'strangers cannot see another family''s events');
select throws_ok(
  $$ select public.save_event(jsonb_build_object('baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'nappy',
       'started_at', now(), 'ended_at', now(), 'details', jsonb_build_object('wet', true))) $$,
  '42501', null, 'strangers cannot log events for another family''s baby');

select pg_temp.sign_out();
select * from finish();
rollback;
