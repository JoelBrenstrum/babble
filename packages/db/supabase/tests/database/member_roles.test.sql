begin;
create extension if not exists pgtap with schema extensions;

select plan(15);
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

create function pg_temp.sign_out()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'postgres', true);
end;
$$;

create function pg_temp.role_of(member uuid)
returns text
language sql
as $$
  select role::text from public.family_members
  where family_id = 'd3000000-0000-0000-0000-00000000000a' and user_id = member;
$$;

update private.instance_settings set signup_mode = 'open';
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('d2000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@roles.test', '{}', now(), now()),
  ('d2000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carer@roles.test', '{}', now(), now()),
  ('d2000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'viewer@roles.test', '{}', now(), now()),
  ('d2000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'stranger@roles.test', '{}', now(), now());
insert into public.families (id, name) values
  ('d3000000-0000-0000-0000-00000000000a', 'Roles'),
  ('d3000000-0000-0000-0000-00000000000b', 'Elsewhere');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('d3000000-0000-0000-0000-00000000000a', 'd2000000-0000-0000-0000-00000000000a', 'owner', 'Admin'),
  ('d3000000-0000-0000-0000-00000000000a', 'd2000000-0000-0000-0000-00000000000b', 'caregiver', 'Carer'),
  ('d3000000-0000-0000-0000-00000000000a', 'd2000000-0000-0000-0000-00000000000c', 'viewer', 'Viewer'),
  ('d3000000-0000-0000-0000-00000000000b', 'd2000000-0000-0000-0000-00000000000d', 'owner', 'Stranger');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('d4000000-0000-0000-0000-00000000000a', 'd3000000-0000-0000-0000-00000000000a', 'Ada', current_date, 'UTC');

select pg_temp.sign_in_as('d2000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$ insert into public.babies (family_id, name, birth_date, timezone)
     values ('d3000000-0000-0000-0000-00000000000a', 'Twin', current_date, 'UTC') $$,
  '42501', null, 'a caregiver cannot add a baby'
);
update public.babies set name = 'Changed' where id = 'd4000000-0000-0000-0000-00000000000a';
update public.baby_settings set night_start_minutes = 60 where baby_id = 'd4000000-0000-0000-0000-00000000000a';
select lives_ok(
  $$ insert into public.events (baby_id, type, started_at)
     values ('d4000000-0000-0000-0000-00000000000a', 'custom', now()) $$,
  'a caregiver can still log entries'
);
select throws_ok(
  $$ select public.set_member_role('d3000000-0000-0000-0000-00000000000a', 'd2000000-0000-0000-0000-00000000000b', 'owner') $$,
  '42501', 'Only admins can change roles', 'a caregiver cannot promote themselves'
);
select pg_temp.sign_out();
select is(
  (select name || night_start_minutes from public.babies b join public.baby_settings s on s.baby_id = b.id
   where b.id = 'd4000000-0000-0000-0000-00000000000a'),
  'Ada1140',
  'a caregiver cannot change the baby or its settings'
);

select pg_temp.sign_in_as('d2000000-0000-0000-0000-00000000000d');
select throws_ok(
  $$ select public.set_member_role('d3000000-0000-0000-0000-00000000000a', 'd2000000-0000-0000-0000-00000000000b', 'viewer') $$,
  '42501', 'Only admins can change roles', 'an admin of another family cannot change roles here'
);

select pg_temp.sign_in_as('d2000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ select public.set_member_role('d3000000-0000-0000-0000-00000000000a', 'd2000000-0000-0000-0000-00000000000a', 'caregiver') $$,
  'PL004', 'A family needs at least one admin', 'the last admin cannot step down'
);
select throws_ok(
  $$ select public.set_member_role('d3000000-0000-0000-0000-00000000000a', 'd2000000-0000-0000-0000-00000000000d', 'viewer') $$,
  'P0001', 'That person is not in this family', 'only members of the family can be given a role'
);
select lives_ok(
  $$ select public.set_member_role('d3000000-0000-0000-0000-00000000000a', 'd2000000-0000-0000-0000-00000000000c', 'caregiver') $$,
  'an admin can change a viewer to a caregiver'
);
select is(pg_temp.role_of('d2000000-0000-0000-0000-00000000000c'), 'caregiver', 'the new role is saved');
select lives_ok(
  $$ select public.set_member_role('d3000000-0000-0000-0000-00000000000a', 'd2000000-0000-0000-0000-00000000000b', 'owner') $$,
  'an admin can make someone else an admin'
);
select lives_ok(
  $$ select public.set_member_role('d3000000-0000-0000-0000-00000000000a', 'd2000000-0000-0000-0000-00000000000a', 'viewer') $$,
  'an admin can step down once there is another admin'
);
select is(pg_temp.role_of('d2000000-0000-0000-0000-00000000000a'), 'viewer', 'the former admin is now read only');
select throws_ok(
  $$ select public.create_invite('d3000000-0000-0000-0000-00000000000a') $$,
  '42501', 'Only admins can invite', 'a former admin can no longer invite'
);

select pg_temp.sign_in_as('d2000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$ select public.create_invite('d3000000-0000-0000-0000-00000000000a', 'owner') $$,
  'the new admin can invite another admin'
);
select pg_temp.sign_out();
select is(
  (select role::text from public.family_invites where family_id = 'd3000000-0000-0000-0000-00000000000a'),
  'owner',
  'the invite carries the admin role'
);

select * from finish();
rollback;
