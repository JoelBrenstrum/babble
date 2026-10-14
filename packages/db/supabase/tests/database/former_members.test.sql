begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

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
  ('a4000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'owner@former.test', '{}', now(), now()),
  ('a4000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'chair@former.test', '{}', now(), now()),
  ('a4000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'gone@former.test', '{}', now(), now()),
  ('a4000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'stranger@former.test', '{}', now(), now());
insert into public.families (id, name) values
  ('b4000000-0000-0000-0000-00000000000a', 'Home'),
  ('b4000000-0000-0000-0000-00000000000b', 'Elsewhere');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('b4000000-0000-0000-0000-00000000000a', 'a4000000-0000-0000-0000-00000000000a', 'owner', 'Owner'),
  ('b4000000-0000-0000-0000-00000000000a', 'a4000000-0000-0000-0000-00000000000b', 'caregiver', 'Chair'),
  ('b4000000-0000-0000-0000-00000000000a', 'a4000000-0000-0000-0000-00000000000c', 'caregiver', 'Gone'),
  ('b4000000-0000-0000-0000-00000000000b', 'a4000000-0000-0000-0000-00000000000d', 'owner', 'Stranger');

select pg_temp.sign_in_as('a4000000-0000-0000-0000-00000000000a');
delete from public.family_members
where family_id = 'b4000000-0000-0000-0000-00000000000a' and user_id = 'a4000000-0000-0000-0000-00000000000b';

select is(
  (select display_name from public.former_members where user_id = 'a4000000-0000-0000-0000-00000000000b'),
  'Chair',
  'a removed member''s name is kept for their history'
);
select is(
  (select count(*)::int from public.family_members where user_id = 'a4000000-0000-0000-0000-00000000000b'),
  0,
  'the removed member is no longer a member'
);
select throws_ok(
  $$ insert into public.former_members (family_id, user_id, display_name)
     values ('b4000000-0000-0000-0000-00000000000a', 'a4000000-0000-0000-0000-00000000000d', 'Fake') $$,
  '42501', null,
  'members cannot add former members themselves'
);

select pg_temp.sign_in_as('a4000000-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.former_members), 0, 'other families cannot see former members');

select pg_temp.sign_in_as('a4000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.former_members), 0, 'a removed member cannot see the family any more');

reset role;
insert into public.family_members (family_id, user_id, role, display_name) values
  ('b4000000-0000-0000-0000-00000000000a', 'a4000000-0000-0000-0000-00000000000b', 'viewer', 'Chair again');
select is(
  (select count(*)::int from public.former_members where user_id = 'a4000000-0000-0000-0000-00000000000b'),
  0,
  'rejoining clears the former member'
);

delete from auth.users where id = 'a4000000-0000-0000-0000-00000000000c';
select is(
  (select count(*)::int from public.former_members where user_id = 'a4000000-0000-0000-0000-00000000000c'),
  0,
  'a deleted account leaves no name behind'
);

delete from public.family_members
where family_id = 'b4000000-0000-0000-0000-00000000000a' and user_id = 'a4000000-0000-0000-0000-00000000000b';
delete from auth.users where id = 'a4000000-0000-0000-0000-00000000000b';
select is(
  (select count(*)::int from public.former_members where user_id = 'a4000000-0000-0000-0000-00000000000b'),
  0,
  'deleting a former member''s account forgets their name'
);

select * from finish();
rollback;
