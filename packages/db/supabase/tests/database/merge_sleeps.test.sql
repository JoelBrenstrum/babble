begin;
create extension if not exists pgtap with schema extensions;

select plan(20);
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
  ('54000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'jane@merge-sleeps.test', '{}', now(), now()),
  ('54000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'john@merge-sleeps.test', '{}', now(), now()),
  ('54000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'gran@merge-sleeps.test', '{}', now(), now());
insert into public.families (id, name) values ('64000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('64000000-0000-0000-0000-00000000000a', '54000000-0000-0000-0000-00000000000a', 'owner', 'Jane'),
  ('64000000-0000-0000-0000-00000000000a', '54000000-0000-0000-0000-00000000000b', 'caregiver', 'John'),
  ('64000000-0000-0000-0000-00000000000a', '54000000-0000-0000-0000-00000000000c', 'viewer', 'Gran');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('74000000-0000-0000-0000-00000000000a', '64000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC'),
  ('74000000-0000-0000-0000-00000000000b', '64000000-0000-0000-0000-00000000000a', 'Jacob', '2026-09-26', 'UTC');

insert into public.events (id, baby_id, type, started_at, ended_at, notes) values
  ('84000000-0000-0000-0000-000000000001', '74000000-0000-0000-0000-00000000000a', 'sleep',
   now() - interval '5 hours', now() - interval '4 hours', 'Cot'),
  ('84000000-0000-0000-0000-000000000002', '74000000-0000-0000-0000-00000000000a', 'sleep',
   now() - interval '230 minutes', now() - interval '3 hours', 'Pram'),
  ('84000000-0000-0000-0000-000000000003', '74000000-0000-0000-0000-00000000000a', 'sleep',
   now() - interval '90 minutes', now() - interval '60 minutes', null),
  ('84000000-0000-0000-0000-000000000004', '74000000-0000-0000-0000-00000000000a', 'sleep',
   now() - interval '50 minutes', null, null),
  ('84000000-0000-0000-0000-000000000005', '74000000-0000-0000-0000-00000000000a', 'breast_feed',
   now() - interval '55 minutes', now() - interval '52 minutes', null),
  ('84000000-0000-0000-0000-000000000006', '74000000-0000-0000-0000-00000000000b', 'sleep',
   now() - interval '55 minutes', now() - interval '52 minutes', null);
insert into public.sleep_details (event_id, locations, fall_asleep, start_moods, end_moods, woken_by_carer) values
  ('84000000-0000-0000-0000-000000000001', '{cot}', 'under_10_min', '{happy}', '{}', false),
  ('84000000-0000-0000-0000-000000000002', '{cot,pram}', null, '{}', '{upset}', true);
insert into public.timed_segments (event_id, side, started_at, ended_at) values
  ('84000000-0000-0000-0000-000000000002', null, now() - interval '230 minutes', now() - interval '210 minutes'),
  ('84000000-0000-0000-0000-000000000002', null, now() - interval '200 minutes', now() - interval '3 hours');
insert into public.session_details (event_id, state) values
  ('84000000-0000-0000-0000-000000000003', 'ended'),
  ('84000000-0000-0000-0000-000000000004', 'running');
select set_config('babble.keep_event_end', 'on', true);
update public.events
set ended_by = '54000000-0000-0000-0000-00000000000b', ended_device = 'Phone', end_recorded_at = now() - interval '175 minutes'
where id = '84000000-0000-0000-0000-000000000002';
select set_config('babble.keep_event_end', 'off', true);

select pg_temp.sign_in_as('54000000-0000-0000-0000-00000000000c');
select throws_ok(
  $$ select public.merge_sleeps('84000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'read-only members cannot merge sleeps'
);

select pg_temp.sign_in_as('54000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$ select public.merge_sleeps('84000000-0000-0000-0000-000000000002', '84000000-0000-0000-0000-000000000003') $$,
  'PL007', 'Sleeps can only be merged when the second starts during the first or within 20 minutes of it ending',
  'sleeps more than 20 minutes apart cannot be merged'
);
select throws_ok(
  $$ select public.merge_sleeps('84000000-0000-0000-0000-000000000003', '84000000-0000-0000-0000-000000000005') $$,
  'PL007', 'Only sleeps for the same baby can be merged', 'feeds cannot be merged into sleeps'
);
select throws_ok(
  $$ select public.merge_sleeps('84000000-0000-0000-0000-000000000003', '84000000-0000-0000-0000-000000000006') $$,
  'PL007', 'Only sleeps for the same baby can be merged', 'sleeps for different babies cannot be merged'
);
select throws_ok(
  $$ select public.merge_sleeps('84000000-0000-0000-0000-000000000004', '84000000-0000-0000-0000-000000000003') $$,
  'PL007', null, 'a running sleep cannot take in another sleep'
);
select throws_ok(
  $$ select public.merge_feeds('84000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000002') $$,
  'PL007', 'Only breastfeeds for the same baby can be merged', 'sleeps cannot be merged as feeds'
);

select lives_ok(
  $$ select public.merge_sleeps('84000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000002') $$,
  'a caregiver merges two sleeps ten minutes apart'
);
select results_eq(
  $$ select started_at, ended_at from public.timed_segments
     where event_id = '84000000-0000-0000-0000-000000000001' order by started_at $$,
  $$ values (now() - interval '5 hours', now() - interval '4 hours'),
            (now() - interval '230 minutes', now() - interval '210 minutes'),
            (now() - interval '200 minutes', now() - interval '3 hours') $$,
  'the merged sleep keeps each stretch asleep, so the gaps read as awake'
);
select ok(
  (select ended_at = now() - interval '3 hours'
     and ended_by = '54000000-0000-0000-0000-00000000000b'::uuid
     and ended_device = 'Phone'
     and end_recorded_at = now() - interval '175 minutes'
   from public.events where id = '84000000-0000-0000-0000-000000000001'),
  'the merged sleep ends when the later one ended, by whoever ended it and on that device'
);
select is(
  (select notes from public.events where id = '84000000-0000-0000-0000-000000000001'),
  e'Cot\nPram', 'notes from both sleeps are kept'
);
select ok(
  (select locations = '{cot,pram}' and fall_asleep = 'under_10_min' and start_moods = '{happy}' and end_moods = '{upset}'
     and woken_by_carer
   from public.sleep_details where event_id = '84000000-0000-0000-0000-000000000001'),
  'details combine: how it started from the first sleep, how it ended from the second'
);
select ok(
  (select deleted_at is not null from public.events where id = '84000000-0000-0000-0000-000000000002'),
  'the later sleep is removed'
);
select throws_ok(
  $$ select public.merge_sleeps('84000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000002') $$,
  'PL007', 'Those sleeps can''t be found', 'a removed sleep cannot be merged again'
);

select lives_ok(
  $$ select public.merge_sleeps('84000000-0000-0000-0000-000000000003', '84000000-0000-0000-0000-000000000004') $$,
  'a running sleep merges into the sleep just before it'
);
select ok(
  (select e.ended_at is null and d.state = 'running'
     and (select count(*) from public.timed_segments s where s.event_id = e.id and s.ended_at is null) = 1
   from public.events e join public.session_details d on d.event_id = e.id
   where e.id = '84000000-0000-0000-0000-000000000003'),
  'the merged sleep is running again, asleep since the later sleep started'
);
select lives_ok(
  $$ select public.pause_session('84000000-0000-0000-0000-000000000003');
     select public.resume_session('84000000-0000-0000-0000-000000000003');
     select public.end_session('84000000-0000-0000-0000-000000000003') $$,
  'the merged sleep can pause, resume and end'
);

reset role;
insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('84000000-0000-0000-0000-000000000007', '74000000-0000-0000-0000-00000000000a', 'sleep',
   now() - interval '10 hours', now() - interval '9 hours'),
  ('84000000-0000-0000-0000-000000000008', '74000000-0000-0000-0000-00000000000a', 'sleep',
   now() - interval '560 minutes', now() - interval '8 hours'),
  ('84000000-0000-0000-0000-000000000009', '74000000-0000-0000-0000-00000000000a', 'sleep',
   now() - interval '590 minutes', now() - interval '570 minutes');
select pg_temp.sign_in_as('54000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$ select public.merge_sleeps('84000000-0000-0000-0000-000000000007', '84000000-0000-0000-0000-000000000009') $$,
  'PL007', null, 'a sleep inside another cannot be merged into it'
);
select lives_ok(
  $$ select public.merge_sleeps('84000000-0000-0000-0000-000000000007', '84000000-0000-0000-0000-000000000008') $$,
  'a sleep that started before the last one ended can be merged into it'
);
select results_eq(
  $$ select started_at, ended_at from public.timed_segments
     where event_id = '84000000-0000-0000-0000-000000000007' order by started_at $$,
  $$ values (now() - interval '10 hours', now() - interval '560 minutes'),
            (now() - interval '560 minutes', now() - interval '8 hours') $$,
  'the overlap is counted once, from the later sleep'
);
select is(
  (select ended_at from public.events where id = '84000000-0000-0000-0000-000000000007'),
  now() - interval '8 hours', 'the overlapping merge ends when the later sleep ended'
);

select * from finish();
rollback;
