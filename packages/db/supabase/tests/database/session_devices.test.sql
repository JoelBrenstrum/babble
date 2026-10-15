begin;
create extension if not exists pgtap with schema extensions;

select plan(26);
update private.instance_settings set billing_enabled = false;

create function pg_temp.sign_in_as(user_id uuid, session_id uuid, device text default null)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated', 'session_id', session_id)::text,
    true
  );
  perform set_config('request.headers', json_build_object('x-babble-device', device)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

update private.instance_settings set signup_mode = 'open';
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('a6000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@sessions.test', '{}', now(), now()),
  ('a6000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carer@sessions.test', '{}', now(), now()),
  ('a6000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'stranger@sessions.test', '{}', now(), now());
insert into auth.sessions (id, user_id, created_at, updated_at, user_agent, not_after) values
  ('c6000000-0000-0000-0000-00000000000a', 'a6000000-0000-0000-0000-00000000000a', now() - interval '2 days', now() - interval '1 hour', 'Mac Chrome', null),
  ('c6000000-0000-0000-0000-00000000000b', 'a6000000-0000-0000-0000-00000000000b', now() - interval '1 day', now() - interval '5 minutes', 'Pi Chromium', null),
  ('c6000000-0000-0000-0000-00000000000d', 'a6000000-0000-0000-0000-00000000000b', now() - interval '9 days', now() - interval '8 days', 'Old', now() - interval '1 day'),
  ('c6000000-0000-0000-0000-00000000000c', 'a6000000-0000-0000-0000-00000000000c', now(), now(), 'Elsewhere', null),
  ('c6000000-0000-0000-0000-00000000000e', 'a6000000-0000-0000-0000-00000000000b', now() - interval '60 days', now() - interval '40 days', 'Stale', null),
  ('c6000000-0000-0000-0000-00000000000f', 'a6000000-0000-0000-0000-00000000000b', now() - interval '3 days', now() - interval '3 days', 'Phone', null);
insert into public.families (id, name) values
  ('b6000000-0000-0000-0000-00000000000a', 'Home'),
  ('b6000000-0000-0000-0000-00000000000b', 'Elsewhere');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('b6000000-0000-0000-0000-00000000000a', 'a6000000-0000-0000-0000-00000000000a', 'owner', 'Admin'),
  ('b6000000-0000-0000-0000-00000000000a', 'a6000000-0000-0000-0000-00000000000b', 'caregiver', 'Carer'),
  ('b6000000-0000-0000-0000-00000000000b', 'a6000000-0000-0000-0000-00000000000c', 'owner', 'Stranger');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('d6000000-0000-0000-0000-00000000000a', 'b6000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');

select pg_temp.sign_in_as('a6000000-0000-0000-0000-00000000000a', 'c6000000-0000-0000-0000-00000000000a');
select throws_ok($$ select * from public.session_devices $$, '42501', null, 'device names cannot be read directly');
select throws_ok(
  $$ insert into public.session_devices (session_id, user_id, name)
     values ('c6000000-0000-0000-0000-00000000000a', 'a6000000-0000-0000-0000-00000000000a', 'x') $$,
  '42501', null, 'device names cannot be written directly'
);
select results_eq(
  $$ select member_name, user_agent, is_current from public.family_devices('b6000000-0000-0000-0000-00000000000a') $$,
  $$ values ('Admin'::text, 'Mac Chrome'::text, true), ('Carer'::text, 'Pi Chromium'::text, false),
            ('Carer'::text, 'Phone'::text, false) $$,
  'an admin sees this device first, then others newest first, without expired or month-old ones'
);
select throws_ok(
  $$ select * from public.family_devices('b6000000-0000-0000-0000-00000000000b') $$,
  '42501', 'You are not in this family',
  'nobody sees devices of a family they are not in'
);
select lives_ok(
  $$ select public.rename_device('c6000000-0000-0000-0000-00000000000b', '  Chair  ') $$,
  'an admin names another member''s device'
);
select is(
  (select name from public.family_devices('b6000000-0000-0000-0000-00000000000a')
   where session_id = 'c6000000-0000-0000-0000-00000000000b'),
  'Chair',
  'the name is trimmed and listed'
);
select lives_ok($$ select public.rename_device('c6000000-0000-0000-0000-00000000000f', 'Gran phone') $$, 'naming a second device');
select results_eq(
  $$ select name from public.family_devices('b6000000-0000-0000-0000-00000000000a') where not is_current $$,
  $$ values ('Chair'::text), ('Gran phone'::text) $$,
  'named devices come before unnamed ones'
);
select lives_ok(
  $$ select public.sign_out_device('c6000000-0000-0000-0000-00000000000f') $$,
  'an admin signs out another member''s device'
);
select is(
  (select count(*)::int from public.family_devices('b6000000-0000-0000-0000-00000000000a')
   where session_id = 'c6000000-0000-0000-0000-00000000000f'),
  0,
  'a signed-out device leaves the list'
);
select throws_ok(
  $$ select public.sign_out_device('c6000000-0000-0000-0000-00000000000c') $$,
  '42501', null,
  'an admin cannot sign out devices outside their families'
);
select throws_ok(
  $$ select public.rename_device('c6000000-0000-0000-0000-00000000000c', 'Mine now') $$,
  '42501', null,
  'an admin cannot name devices outside their families'
);
select throws_ok(
  $$ select public.rename_device('c6000000-0000-0000-0000-00000000000a', repeat('x', 61)) $$,
  '22001', null,
  'names are at most 60 characters'
);

select pg_temp.sign_in_as('a6000000-0000-0000-0000-00000000000b', 'c6000000-0000-0000-0000-00000000000b', 'Linux (Chromium)');
select results_eq(
  $$ select name, is_current from public.family_devices('b6000000-0000-0000-0000-00000000000a') $$,
  $$ values ('Chair'::text, true) $$,
  'a caregiver sees only their own devices'
);
select throws_ok(
  $$ select public.rename_device('c6000000-0000-0000-0000-00000000000a', 'Nope') $$,
  '42501', null,
  'a caregiver cannot name someone else''s device'
);
insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('e6000000-0000-0000-0000-00000000000a', 'd6000000-0000-0000-0000-00000000000a', 'nappy', now(), now());
select is(
  (select created_device from public.events where id = 'e6000000-0000-0000-0000-00000000000a'),
  'Chair',
  'entries take the device''s saved name over the browser label'
);
select lives_ok(
  $$ select public.rename_device('c6000000-0000-0000-0000-00000000000b', '   ') $$,
  'a member clears their own device name'
);
insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('e6000000-0000-0000-0000-00000000000b', 'd6000000-0000-0000-0000-00000000000a', 'nappy', now(), now());
select is(
  (select created_device from public.events where id = 'e6000000-0000-0000-0000-00000000000b'),
  'Linux (Chromium)',
  'without a saved name entries fall back to the browser label'
);
select lives_ok(
  $$ select public.rename_device('c6000000-0000-0000-0000-00000000000b', 'Nursery') $$,
  'a member names their own device'
);
select throws_ok(
  $$ select public.sign_out_device('c6000000-0000-0000-0000-00000000000a') $$,
  '42501', null,
  'a caregiver cannot sign out someone else''s device'
);
select lives_ok(
  $$ select public.sign_out_device('c6000000-0000-0000-0000-00000000000e') $$,
  'a member signs out their own old device'
);

set local role anon;
select throws_ok(
  $$ select * from public.family_devices('b6000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'signed-out visitors cannot list devices'
);
select throws_ok(
  $$ select public.rename_device('c6000000-0000-0000-0000-00000000000b', 'x') $$,
  '42501', null, 'signed-out visitors cannot name devices'
);
select throws_ok(
  $$ select public.sign_out_device('c6000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'signed-out visitors cannot sign devices out'
);

reset role;
select is(
  (select count(*)::int from auth.sessions where id in ('c6000000-0000-0000-0000-00000000000f', 'c6000000-0000-0000-0000-00000000000e')),
  0,
  'signing a device out ends its session'
);
delete from auth.users where id = 'a6000000-0000-0000-0000-00000000000b';
select is(
  (select count(*)::int from public.session_devices where user_id = 'a6000000-0000-0000-0000-00000000000b'),
  0,
  'deleting an account removes its device names'
);

select * from finish();
rollback;
