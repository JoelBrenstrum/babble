begin;
create extension if not exists pgtap with schema extensions;

select plan(48);
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

create function pg_temp.create_user(user_id uuid, email text, metadata jsonb default '{}')
returns void
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, metadata, now(), now());
$$;

-- Rows touched by a statement, or -1 when it is refused outright.
create function pg_temp.rows_changed(statement text)
returns bigint
language plpgsql
as $$
declare
  changed bigint;
begin
  execute statement;
  get diagnostics changed = row_count;
  return changed;
exception when insufficient_privilege then
  return -1;
end;
$$;

update private.instance_settings set signup_mode = 'open';
select pg_temp.create_user('a2000000-0000-0000-0000-00000000000a', 'owner@hardening.test');
select pg_temp.create_user('a2000000-0000-0000-0000-00000000000b', 'carer@hardening.test');
select pg_temp.create_user('a2000000-0000-0000-0000-00000000000c', 'viewer@hardening.test');
select pg_temp.create_user('a2000000-0000-0000-0000-00000000000d', 'outsider@hardening.test');
select pg_temp.create_user('a2000000-0000-0000-0000-00000000000e', 'other@hardening.test');

insert into public.families (id, name) values
  ('a3000000-0000-0000-0000-00000000000a', 'Home'),
  ('a3000000-0000-0000-0000-00000000000b', 'Elsewhere');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('a3000000-0000-0000-0000-00000000000a', 'a2000000-0000-0000-0000-00000000000a', 'owner', 'Owner'),
  ('a3000000-0000-0000-0000-00000000000a', 'a2000000-0000-0000-0000-00000000000b', 'caregiver', 'Carer'),
  ('a3000000-0000-0000-0000-00000000000a', 'a2000000-0000-0000-0000-00000000000c', 'viewer', 'Viewer'),
  ('a3000000-0000-0000-0000-00000000000b', 'a2000000-0000-0000-0000-00000000000d', 'owner', 'Outsider');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('a4000000-0000-0000-0000-00000000000a', 'a3000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC'),
  ('a4000000-0000-0000-0000-00000000000b', 'a3000000-0000-0000-0000-00000000000b', 'Noah', '2026-09-26', 'UTC');

insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('a5000000-0000-0000-0000-000000000001', 'a4000000-0000-0000-0000-00000000000a', 'sleep', now() - interval '3 hours', now() - interval '2 hours'),
  ('a5000000-0000-0000-0000-000000000002', 'a4000000-0000-0000-0000-00000000000a', 'breast_feed', now() - interval '2 hours', now() - interval '1 hour'),
  ('a5000000-0000-0000-0000-000000000003', 'a4000000-0000-0000-0000-00000000000a', 'bottle', now() - interval '1 hour', now() - interval '1 hour'),
  ('a5000000-0000-0000-0000-000000000004', 'a4000000-0000-0000-0000-00000000000a', 'solids', now() - interval '50 minutes', now() - interval '50 minutes'),
  ('a5000000-0000-0000-0000-000000000005', 'a4000000-0000-0000-0000-00000000000a', 'nappy', now() - interval '40 minutes', now() - interval '40 minutes'),
  ('a5000000-0000-0000-0000-000000000006', 'a4000000-0000-0000-0000-00000000000a', 'pump', now() - interval '30 minutes', now() - interval '20 minutes'),
  ('a5000000-0000-0000-0000-000000000007', 'a4000000-0000-0000-0000-00000000000a', 'growth', now() - interval '10 minutes', now() - interval '10 minutes'),
  ('a5000000-0000-0000-0000-000000000008', 'a4000000-0000-0000-0000-00000000000a', 'custom', now() - interval '5 minutes', now() - interval '5 minutes'),
  ('a5000000-0000-0000-0000-000000000009', 'a4000000-0000-0000-0000-00000000000b', 'nappy', now() - interval '5 minutes', now() - interval '5 minutes');
insert into public.sleep_details (event_id) values ('a5000000-0000-0000-0000-000000000001');
insert into public.session_details (event_id, state) values ('a5000000-0000-0000-0000-000000000002', 'ended');
insert into public.timed_segments (event_id, side, started_at, ended_at)
  values ('a5000000-0000-0000-0000-000000000002', 'left', now() - interval '2 hours', now() - interval '1 hour');
insert into public.bottle_details (event_id) values ('a5000000-0000-0000-0000-000000000003');
insert into public.solids_details (event_id, foods) values ('a5000000-0000-0000-0000-000000000004', '{pear}');
insert into public.nappy_details (event_id, wet) values
  ('a5000000-0000-0000-0000-000000000005', true), ('a5000000-0000-0000-0000-000000000009', true);
insert into public.pump_details (event_id, left_ml) values ('a5000000-0000-0000-0000-000000000006', 50);
insert into public.growth_details (event_id, weight_g) values ('a5000000-0000-0000-0000-000000000007', 5000);
insert into public.custom_details (event_id, title) values ('a5000000-0000-0000-0000-000000000008', 'Bath');

select is(
  (select count(*)::int from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'm', 'p')
     and has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger')),
  0,
  'anon has no privileges on any public table'
);
select is(
  (select count(*)::int from information_schema.role_table_grants
   where grantee = 'anon' and table_schema in ('public', 'private')),
  0,
  'anon holds no table grants in the public or private schemas'
);
select is(
  (select count(*)::int from pg_policies where schemaname = 'public'
     and coalesce(qual, '') || coalesce(with_check, '') ~ 'baby_family_id|event_family_id|is_family_member|can_edit_family|has_family_role'),
  0,
  'no policy runs a membership lookup per row'
);
select is(
  (select count(*)::int from pg_indexes where schemaname = 'public'
     and indexname in ('events_created_by_idx', 'events_ended_by_idx', 'family_invites_created_by_idx', 'family_invites_used_by_idx')),
  4,
  'auth.users foreign keys on events and invites are indexed'
);

select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.events where baby_id = 'a4000000-0000-0000-0000-00000000000a'), 0, 'an outsider sees none of another family''s events');
select is((select count(*)::int from public.babies where family_id = 'a3000000-0000-0000-0000-00000000000a'), 0, 'an outsider sees none of another family''s babies');
select is((select count(*)::int from public.family_members where family_id = 'a3000000-0000-0000-0000-00000000000a'), 0, 'an outsider sees none of another family''s members');
select is(
  (select count(*)::int from public.timed_segments where event_id = 'a5000000-0000-0000-0000-000000000002')
  + (select count(*)::int from public.session_details where event_id = 'a5000000-0000-0000-0000-000000000002')
  + (select count(*)::int from public.sleep_details) + (select count(*)::int from public.bottle_details)
  + (select count(*)::int from public.solids_details) + (select count(*)::int from public.pump_details)
  + (select count(*)::int from public.growth_details) + (select count(*)::int from public.custom_details),
  0,
  'an outsider sees none of another family''s segments, sessions or details'
);
select is((select count(*)::int from public.nappy_details), 1, 'an outsider still sees their own family''s details');
select throws_ok(
  $$ insert into public.timed_segments (event_id, side, started_at, ended_at)
     values ('a5000000-0000-0000-0000-000000000002', 'right', now(), now()) $$,
  '42501', null, 'an outsider cannot add a segment to another family''s session'
);
select throws_ok(
  $$ insert into public.session_details (event_id, state) values ('a5000000-0000-0000-0000-000000000006', 'paused') $$,
  '42501', null, 'an outsider cannot add session details to another family''s event'
);
select is(
  pg_temp.rows_changed($$ update public.session_details set state = 'paused' where event_id = 'a5000000-0000-0000-0000-000000000002' $$),
  0::bigint,
  'an outsider cannot change another family''s session'
);

select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.events where baby_id = 'a4000000-0000-0000-0000-00000000000a'), 8, 'a viewer reads the family''s events');
select is((select count(*)::int from public.timed_segments), 1, 'a viewer reads the family''s segments');

create temp table viewer_matrix (label text, denied boolean) on commit drop;
grant all on viewer_matrix to authenticated;
insert into viewer_matrix
select t.name || ' ' || op.name,
  pg_temp.rows_changed(replace(op.statement, '%t', t.name)) <= 0
from (values
  ('sleep_details', 'woken_by_carer = true'), ('session_details', 'state = state'),
  ('timed_segments', 'side = side'), ('bottle_details', 'amount_ml = 1'), ('solids_details', 'amount = ''some'''),
  ('nappy_details', 'wet = true'), ('pump_details', 'left_ml = 1'), ('growth_details', 'weight_g = 5000'),
  ('custom_details', 'title = ''x'''), ('events', 'notes = ''x'''), ('babies', 'name = ''x''')
) as t(name, assignment)
cross join lateral (values
  ('update', 'update public.%t set ' || t.assignment),
  ('delete', 'delete from public.%t')
) as op(name, statement);
insert into viewer_matrix
select t || ' insert', pg_temp.rows_changed(format('insert into public.%I select * from public.%I', t, t)) <= 0
from unnest(array[
  'sleep_details', 'session_details', 'timed_segments', 'bottle_details', 'solids_details',
  'nappy_details', 'pump_details', 'growth_details', 'custom_details'
]) t;
insert into viewer_matrix values
  ('events insert', pg_temp.rows_changed($$ insert into public.events (baby_id, type, started_at)
    values ('a4000000-0000-0000-0000-00000000000a', 'custom', now()) $$) <= 0),
  ('babies insert', pg_temp.rows_changed($$ insert into public.babies (family_id, name, birth_date, timezone)
    values ('a3000000-0000-0000-0000-00000000000a', 'Twin', '2026-09-26', 'UTC') $$) <= 0);

select is(
  (select array_agg(label order by label) from viewer_matrix where not denied),
  null,
  'a viewer cannot insert, update or delete events, babies, segments, sessions or any details'
);
select is((select count(*)::int from viewer_matrix), 33, 'the viewer matrix covers every table and operation');
select throws_ok(
  $$ select public.save_event('{"type":"nappy","baby_id":"a4000000-0000-0000-0000-00000000000a","started_at":"2026-10-01T00:00:00Z","details":{"wet":true}}') $$,
  '42501', null, 'a viewer cannot save an event'
);

select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000b');
select is(pg_temp.rows_changed($$ update public.nappy_details set wet = false where event_id = 'a5000000-0000-0000-0000-000000000005' $$), 1::bigint, 'a caregiver can edit details');
select is(pg_temp.rows_changed($$ delete from public.family_members where user_id = 'a2000000-0000-0000-0000-00000000000c' $$), 0::bigint, 'a caregiver cannot remove another member');
select is(pg_temp.rows_changed($$ delete from public.family_members where user_id = 'a2000000-0000-0000-0000-00000000000a' $$), 0::bigint, 'a caregiver cannot remove the owner');
select throws_ok(
  $$ insert into public.family_invites (family_id, code, created_by)
     values ('a3000000-0000-0000-0000-00000000000a', 'ABCDE-FGHJK', 'a2000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'invites cannot be inserted directly'
);
select throws_ok($$ select private.baby_family_id('a4000000-0000-0000-0000-00000000000b') $$, '42501', null, 'baby ids cannot be mapped to families');
select throws_ok($$ select private.event_family_id('a5000000-0000-0000-0000-000000000009') $$, '42501', null, 'event ids cannot be mapped to families');
select is(
  (select array_agg(p.proname order by p.proname) from pg_proc p
   where p.pronamespace = 'private'::regnamespace and has_function_privilege('authenticated', p.oid, 'execute')
     and p.proname not in (
       'has_family_role', 'is_family_member', 'can_edit_family', 'my_family_ids', 'my_editor_family_ids',
       'my_owner_family_ids', 'my_baby_ids', 'my_editor_baby_ids', 'text_array', 'valid_foods',
       'lock_running_session', 'save_sleep_details', 'save_bottle_details', 'save_nappy_details',
       'save_pump_details', 'save_growth_details', 'save_solids_details', 'save_custom_details', 'save_segments'
     )),
  null,
  'authenticated can execute only the allow-listed private functions'
);
select is(
  (select count(*)::int from pg_proc p
   where p.pronamespace = 'private'::regnamespace and has_function_privilege('anon', p.oid, 'execute')),
  0,
  'anon can execute no private function'
);

select is(pg_temp.rows_changed($$ delete from public.family_members where user_id = 'a2000000-0000-0000-0000-00000000000b' $$), 1::bigint, 'a caregiver can still leave');
reset role;
insert into public.family_members (family_id, user_id, role, display_name)
values ('a3000000-0000-0000-0000-00000000000a', 'a2000000-0000-0000-0000-00000000000b', 'caregiver', 'Carer');
select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000b');

select throws_ok(
  $$ insert into public.nappy_details (event_id, wet) values ('a5000000-0000-0000-0000-000000000001', true) $$,
  '23514', null, 'nappy details cannot hang off a sleep'
);
select throws_ok(
  $$ insert into public.session_details (event_id, state) values ('a5000000-0000-0000-0000-000000000005', 'running') $$,
  '23514', null, 'session details cannot hang off a nappy'
);
select throws_ok(
  $$ insert into public.timed_segments (event_id, side, started_at) values ('a5000000-0000-0000-0000-000000000005', 'left', now()) $$,
  '23514', null, 'segments cannot hang off a nappy'
);
select throws_ok(
  $$ insert into public.pump_details (event_id, left_ml) values ('a5000000-0000-0000-0000-000000000003', 10) $$,
  '23514', null, 'pump details cannot hang off a bottle'
);
select throws_ok(
  $$ insert into public.timed_segments (event_id, side, started_at, ended_at)
     values ('a5000000-0000-0000-0000-000000000002', null, now() - interval '30 minutes', now() - interval '20 minutes') $$,
  '23514', null, 'a feed segment needs a side'
);
select throws_ok(
  $$ update public.timed_segments set side = null where event_id = 'a5000000-0000-0000-0000-000000000002' $$,
  '23514', null, 'a feed segment cannot lose its side'
);
select lives_ok(
  $$ insert into public.timed_segments (event_id, side, started_at, ended_at)
     values ('a5000000-0000-0000-0000-000000000001', null, now() - interval '3 hours', now() - interval '2 hours') $$,
  'a sleep segment has no side'
);
select lives_ok(
  $$ select public.save_event('{"type":"nappy","baby_id":"a4000000-0000-0000-0000-00000000000a","started_at":"2026-10-01T00:00:00Z","details":{"wet":true}}'),
            public.save_event('{"type":"sleep","baby_id":"a4000000-0000-0000-0000-00000000000a","started_at":"2026-10-01T01:00:00Z","ended_at":"2026-10-01T02:00:00Z",
              "segments":[{"started_at":"2026-10-01T01:00:00Z","ended_at":"2026-10-01T02:00:00Z"}]}'),
            public.save_event('{"type":"breast_feed","baby_id":"a4000000-0000-0000-0000-00000000000a","started_at":"2026-10-01T03:00:00Z","ended_at":"2026-10-01T03:10:00Z",
              "segments":[{"side":"left","started_at":"2026-10-01T03:00:00Z","ended_at":"2026-10-01T03:10:00Z"}]}') $$,
  'save_event still stores every kind of event'
);

reset role;
insert into public.events (id, baby_id, type, started_at) values
  ('a5000000-0000-0000-0000-000000000010', 'a4000000-0000-0000-0000-00000000000a', 'breast_feed', now() - interval '1 minute');
insert into public.session_details (event_id, state) values ('a5000000-0000-0000-0000-000000000010', 'running');
select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000b');

select throws_ok(
  $$ do $inner$ begin
       update public.session_details set state = 'ended' where event_id = 'a5000000-0000-0000-0000-000000000010';
       set constraints all immediate;
     end $inner$ $$,
  '23514', null, 'a running session cannot be marked ended directly'
);
select throws_ok(
  $$ do $inner$ begin
       update public.session_details set state = 'paused' where event_id = 'a5000000-0000-0000-0000-000000000002';
       set constraints all immediate;
     end $inner$ $$,
  '23514', null, 'an ended session cannot be marked paused directly'
);
select lives_ok(
  $$ do $inner$ begin
       perform public.pause_session('a5000000-0000-0000-0000-000000000010');
       perform public.end_session('a5000000-0000-0000-0000-000000000010');
       set constraints all immediate;
     end $inner$ $$,
  'the session RPCs keep state and end time in step'
);
select is(
  (select state::text from public.session_details where event_id = 'a5000000-0000-0000-0000-000000000010'),
  'ended',
  'ending a session ends its state'
);
update public.events set ended_at = null where id = 'a5000000-0000-0000-0000-000000000010';
select is(
  (select state::text from public.session_details where event_id = 'a5000000-0000-0000-0000-000000000010'),
  'paused',
  'clearing an event''s end time reopens its session'
);
update public.events set ended_at = now() where id = 'a5000000-0000-0000-0000-000000000010';
select is(
  (select state::text from public.session_details where event_id = 'a5000000-0000-0000-0000-000000000010'),
  'ended',
  'setting an event''s end time ends its session'
);

reset role;
select matches(
  pg_get_functiondef('private.enforce_signup_mode'::regproc),
  'pg_advisory_xact_lock',
  'signup serialises on an advisory lock so two first sign-ups cannot both be treated as the first'
);

set constraints all deferred;
update private.instance_settings set signup_mode = 'invite_only';
select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000a');
create temp table invite on commit drop as select * from public.create_invite('a3000000-0000-0000-0000-00000000000a');
grant select on invite to authenticated;
reset role;
select lives_ok(
  format($$ select pg_temp.create_user('a2000000-0000-0000-0000-000000000020', 'signedup@hardening.test', %L) $$,
    json_build_object('invite_code', (select code from invite))),
  'a user signs up with an invite code'
);
select is(
  (select signed_up_user_id from public.family_invites where code = (select code from invite)),
  'a2000000-0000-0000-0000-000000000020'::uuid,
  'the invite remembers who signed up with it'
);
select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000e');
select throws_ok(
  $$ select public.accept_invite((select code from invite), 'Other') $$,
  'P0002', 'This invite code is invalid, used or expired',
  'an invite used to sign up one person cannot be accepted by someone else'
);
select pg_temp.sign_in_as('a2000000-0000-0000-0000-000000000020');
select is(
  public.accept_invite((select code from invite), 'Signed up'),
  'a3000000-0000-0000-0000-00000000000a'::uuid,
  'the person who signed up with the invite can accept it'
);

reset role;
insert into public.families (id, name) values
  ('a3000000-0000-0000-0000-00000000000c', 'Watchers'), ('a3000000-0000-0000-0000-00000000000d', 'Mixed');
insert into public.family_members (family_id, user_id, role, display_name, created_at) values
  ('a3000000-0000-0000-0000-00000000000c', 'a2000000-0000-0000-0000-00000000000a', 'owner', 'Owner', now() - interval '3 days'),
  ('a3000000-0000-0000-0000-00000000000c', 'a2000000-0000-0000-0000-00000000000c', 'viewer', 'Viewer', now() - interval '2 days'),
  ('a3000000-0000-0000-0000-00000000000d', 'a2000000-0000-0000-0000-00000000000a', 'owner', 'Owner', now() - interval '3 days'),
  ('a3000000-0000-0000-0000-00000000000d', 'a2000000-0000-0000-0000-00000000000c', 'viewer', 'Viewer', now() - interval '2 days'),
  ('a3000000-0000-0000-0000-00000000000d', 'a2000000-0000-0000-0000-00000000000b', 'caregiver', 'Carer', now() - interval '1 day');
delete from public.family_members
where user_id = 'a2000000-0000-0000-0000-00000000000a'
  and family_id in ('a3000000-0000-0000-0000-00000000000c', 'a3000000-0000-0000-0000-00000000000d');
select is(
  (select role::text from public.family_members
   where family_id = 'a3000000-0000-0000-0000-00000000000c' and user_id = 'a2000000-0000-0000-0000-00000000000c'),
  'viewer',
  'a lone viewer is not promoted to owner when the owner leaves'
);
select ok(
  exists (select 1 from public.families where id = 'a3000000-0000-0000-0000-00000000000c'),
  'a family with only viewers left keeps its data'
);
select is(
  (select array_agg(user_id::text || ':' || role::text order by user_id) from public.family_members
   where family_id = 'a3000000-0000-0000-0000-00000000000d'),
  array['a2000000-0000-0000-0000-00000000000b:owner', 'a2000000-0000-0000-0000-00000000000c:viewer'],
  'the owner role passes to a caregiver ahead of an older viewer'
);

select * from finish();
rollback;
