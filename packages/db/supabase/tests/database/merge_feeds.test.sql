begin;
create extension if not exists pgtap with schema extensions;

select plan(19);
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
  ('53000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'jane@merge.test', '{}', now(), now()),
  ('53000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'john@merge.test', '{}', now(), now()),
  ('53000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'gran@merge.test', '{}', now(), now()),
  ('53000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'stranger@merge.test', '{}', now(), now());
insert into public.families (id, name) values
  ('63000000-0000-0000-0000-00000000000a', 'Home'),
  ('63000000-0000-0000-0000-00000000000b', 'Elsewhere');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('63000000-0000-0000-0000-00000000000a', '53000000-0000-0000-0000-00000000000a', 'owner', 'Jane'),
  ('63000000-0000-0000-0000-00000000000a', '53000000-0000-0000-0000-00000000000b', 'caregiver', 'John'),
  ('63000000-0000-0000-0000-00000000000a', '53000000-0000-0000-0000-00000000000c', 'viewer', 'Gran'),
  ('63000000-0000-0000-0000-00000000000b', '53000000-0000-0000-0000-00000000000d', 'owner', 'Stranger');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('73000000-0000-0000-0000-00000000000a', '63000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC'),
  ('73000000-0000-0000-0000-00000000000b', '63000000-0000-0000-0000-00000000000a', 'Jacob', '2026-09-26', 'UTC');

insert into public.events (id, baby_id, type, started_at, ended_at, notes) values
  ('83000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-00000000000a', 'breast_feed',
   now() - interval '3 hours', now() - interval '170 minutes', 'Fussy'),
  ('83000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-00000000000a', 'breast_feed',
   now() - interval '160 minutes', now() - interval '150 minutes', 'Settled'),
  ('83000000-0000-0000-0000-000000000003', '73000000-0000-0000-0000-00000000000a', 'breast_feed',
   now() - interval '60 minutes', now() - interval '50 minutes', null),
  ('83000000-0000-0000-0000-000000000004', '73000000-0000-0000-0000-00000000000a', 'breast_feed',
   now() - interval '40 minutes', null, null),
  ('83000000-0000-0000-0000-000000000005', '73000000-0000-0000-0000-00000000000a', 'bottle',
   now() - interval '45 minutes', now() - interval '45 minutes', null),
  ('83000000-0000-0000-0000-000000000006', '73000000-0000-0000-0000-00000000000b', 'breast_feed',
   now() - interval '45 minutes', now() - interval '44 minutes', null);
select set_config('babble.keep_event_end', 'on', true);
update public.events set ended_by = '53000000-0000-0000-0000-00000000000b'
  where id = '83000000-0000-0000-0000-000000000002';
select set_config('babble.keep_event_end', 'off', true);
insert into public.timed_segments (event_id, side, started_at, ended_at) values
  ('83000000-0000-0000-0000-000000000001', 'left', now() - interval '3 hours', now() - interval '170 minutes'),
  ('83000000-0000-0000-0000-000000000002', 'right', now() - interval '160 minutes', now() - interval '150 minutes'),
  ('83000000-0000-0000-0000-000000000003', 'left', now() - interval '60 minutes', now() - interval '50 minutes'),
  ('83000000-0000-0000-0000-000000000004', 'right', now() - interval '40 minutes', null);
insert into public.session_details (event_id, state) values
  ('83000000-0000-0000-0000-000000000001', 'ended'),
  ('83000000-0000-0000-0000-000000000002', 'ended'),
  ('83000000-0000-0000-0000-000000000003', 'ended'),
  ('83000000-0000-0000-0000-000000000004', 'running');

select pg_temp.sign_in_as('53000000-0000-0000-0000-00000000000c');
select throws_ok(
  $$ select public.merge_feeds('83000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'read-only members cannot merge feeds'
);
select pg_temp.sign_in_as('53000000-0000-0000-0000-00000000000d');
select throws_ok(
  $$ select public.merge_feeds('83000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000002') $$,
  '42501', null, 'people outside the family cannot merge feeds'
);

select pg_temp.sign_in_as('53000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ select public.merge_feeds('83000000-0000-0000-0000-000000000002', '83000000-0000-0000-0000-000000000003') $$,
  'PL007', 'Feeds can only be merged when the second starts during the first or within 20 minutes of it ending',
  'feeds more than 20 minutes apart cannot be merged'
);
select throws_ok(
  $$ select public.merge_feeds('83000000-0000-0000-0000-000000000002', '83000000-0000-0000-0000-000000000001') $$,
  'PL007', null, 'a feed cannot be merged into a later one'
);
select throws_ok(
  $$ select public.merge_feeds('83000000-0000-0000-0000-000000000003', '83000000-0000-0000-0000-000000000005') $$,
  'PL007', 'Only breastfeeds for the same baby can be merged', 'bottles cannot be merged'
);
select throws_ok(
  $$ select public.merge_feeds('83000000-0000-0000-0000-000000000003', '83000000-0000-0000-0000-000000000006') $$,
  'PL007', 'Only breastfeeds for the same baby can be merged', 'feeds for different babies cannot be merged'
);
select throws_ok(
  $$ select public.merge_feeds('83000000-0000-0000-0000-000000000004', '83000000-0000-0000-0000-000000000003') $$,
  'PL007', null, 'a running feed cannot take in another feed'
);

select pg_temp.sign_in_as('53000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$ select public.merge_feeds('83000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000002') $$,
  'a caregiver merges two feeds ten minutes apart'
);
select is(
  (select count(*)::int from public.timed_segments where event_id = '83000000-0000-0000-0000-000000000001'),
  2, 'the later feed''s sides move into the earlier one'
);
select ok(
  (select ended_at = now() - interval '150 minutes' and ended_by = '53000000-0000-0000-0000-00000000000b'::uuid
   from public.events where id = '83000000-0000-0000-0000-000000000001'),
  'the merged feed ends when, and by whom, the later one ended'
);
select is(
  (select notes from public.events where id = '83000000-0000-0000-0000-000000000001'),
  e'Fussy\nSettled', 'notes from both feeds are kept'
);
select ok(
  (select deleted_at is not null from public.events where id = '83000000-0000-0000-0000-000000000002'),
  'the later feed is removed'
);
select throws_ok(
  $$ select public.merge_feeds('83000000-0000-0000-0000-000000000001', '83000000-0000-0000-0000-000000000002') $$,
  'PL007', 'Those feeds can''t be found', 'a removed feed cannot be merged again'
);

select lives_ok(
  $$ select public.merge_feeds('83000000-0000-0000-0000-000000000003', '83000000-0000-0000-0000-000000000004') $$,
  'a running feed merges into the feed just before it'
);
select ok(
  (select e.ended_at is null and e.ended_by is null and d.state = 'running'
   from public.events e join public.session_details d on d.event_id = e.id
   where e.id = '83000000-0000-0000-0000-000000000003'),
  'the merged feed is running again'
);
select lives_ok(
  $$ select public.switch_side('83000000-0000-0000-0000-000000000003', 'left');
     select public.end_session('83000000-0000-0000-0000-000000000003') $$,
  'the merged feed can switch sides and end'
);
select ok(
  (select ended_by = '53000000-0000-0000-0000-00000000000a'::uuid and end_recorded_at is not null
   from public.events where id = '83000000-0000-0000-0000-000000000003'),
  'ending the merged feed records who ended it as usual'
);

reset role;
insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('83000000-0000-0000-0000-000000000007', '73000000-0000-0000-0000-00000000000a', 'breast_feed',
   now() - interval '8 hours', now() - interval '470 minutes'),
  ('83000000-0000-0000-0000-000000000008', '73000000-0000-0000-0000-00000000000a', 'breast_feed',
   now() - interval '475 minutes', now() - interval '460 minutes');
insert into public.timed_segments (event_id, side, started_at, ended_at) values
  ('83000000-0000-0000-0000-000000000007', 'left', now() - interval '8 hours', now() - interval '470 minutes'),
  ('83000000-0000-0000-0000-000000000008', 'right', now() - interval '475 minutes', now() - interval '460 minutes');
select pg_temp.sign_in_as('53000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$ select public.merge_feeds('83000000-0000-0000-0000-000000000007', '83000000-0000-0000-0000-000000000008') $$,
  'a feed that started before the last one ended can be merged into it'
);
select results_eq(
  $$ select side::text, started_at, ended_at from public.timed_segments
     where event_id = '83000000-0000-0000-0000-000000000007' order by started_at $$,
  $$ values ('left', now() - interval '8 hours', now() - interval '475 minutes'),
            ('right', now() - interval '475 minutes', now() - interval '460 minutes') $$,
  'the earlier feed stops where the later one started'
);

select * from finish();
rollback;
