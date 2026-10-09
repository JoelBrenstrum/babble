begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

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
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('a0000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'owner@invites.test', '{}', now(), now()),
  ('a0000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carer@invites.test', '{}', now(), now()),
  ('a0000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'viewer@invites.test', '{}', now(), now()),
  ('a0000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'stranger@invites.test', '{}', now(), now());
insert into public.families (id, name) values
  ('b0000000-0000-0000-0000-00000000000a', 'Home'),
  ('b0000000-0000-0000-0000-00000000000b', 'Elsewhere');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('b0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'owner', 'Owner'),
  ('b0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000b', 'caregiver', 'Carer'),
  ('b0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000c', 'viewer', 'Viewer'),
  ('b0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000d', 'owner', 'Stranger');
insert into public.family_invites (id, family_id, code, created_by) values
  ('c0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000a', 'INVTS-TEST1',
   'a0000000-0000-0000-0000-00000000000a'),
  ('c0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-00000000000a', 'INVTS-TEST2',
   'a0000000-0000-0000-0000-00000000000a');

select pg_temp.sign_in_as('a0000000-0000-0000-0000-00000000000c');
delete from public.family_invites where id = 'c0000000-0000-0000-0000-00000000000a';
select pg_temp.sign_in_as('a0000000-0000-0000-0000-00000000000d');
delete from public.family_invites where id = 'c0000000-0000-0000-0000-00000000000a';
select is((select count(*)::int from public.family_invites where code like 'INVTS-%'), 0, 'other families cannot see invites');
select pg_temp.sign_out();
select is(
  (select count(*)::int from public.family_invites where id = 'c0000000-0000-0000-0000-00000000000a'),
  1,
  'viewers and other families cannot revoke invites'
);

select pg_temp.sign_in_as('a0000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.family_invites where code like 'INVTS-%'), 2, 'caregivers see pending invites');
delete from public.family_invites where id = 'c0000000-0000-0000-0000-00000000000a';
select pg_temp.sign_in_as('a0000000-0000-0000-0000-00000000000a');
delete from public.family_invites where id = 'c0000000-0000-0000-0000-00000000000b';
select pg_temp.sign_out();
select is((select count(*)::int from public.family_invites where code like 'INVTS-%'), 0, 'caregivers and owners can revoke invites');

select pg_temp.sign_in_as('a0000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ select public.accept_invite('INVTS-TEST1', 'Late') $$,
  'P0002',
  'This invite code is invalid, used or expired',
  'a revoked invite code no longer works'
);
select is((select count(*)::int from public.check_invite('INVTS-TEST1')), 0, 'a revoked invite code no longer checks out');

select * from finish();
rollback;
