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
  ('a1000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'owner@names.test', '{}', now(), now()),
  ('a1000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carer@names.test', '{}', now(), now()),
  ('a1000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'nanny@names.test', '{}', now(), now()),
  ('a1000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'stranger@names.test', '{}', now(), now());
insert into public.families (id, name) values
  ('b1000000-0000-0000-0000-00000000000a', 'Home'),
  ('b1000000-0000-0000-0000-00000000000b', 'Elsewhere');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('b1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-00000000000a', 'owner', 'Owner'),
  ('b1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-00000000000b', 'caregiver', 'Carer'),
  ('b1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-00000000000c', 'caregiver', 'Nanny'),
  ('b1000000-0000-0000-0000-00000000000b', 'a1000000-0000-0000-0000-00000000000d', 'owner', 'Stranger');

create function pg_temp.name_of(member uuid)
returns text
language sql
as $$
  select display_name from public.family_members
  where family_id = 'b1000000-0000-0000-0000-00000000000a' and user_id = member;
$$;

select pg_temp.sign_in_as('a1000000-0000-0000-0000-00000000000a');
update public.family_members set display_name = 'Grandma'
  where family_id = 'b1000000-0000-0000-0000-00000000000a' and user_id = 'a1000000-0000-0000-0000-00000000000b';
select pg_temp.sign_out();
select is(pg_temp.name_of('a1000000-0000-0000-0000-00000000000b'), 'Grandma', 'owners rename caregivers');

select pg_temp.sign_in_as('a1000000-0000-0000-0000-00000000000c');
update public.family_members set display_name = 'Mary'
  where family_id = 'b1000000-0000-0000-0000-00000000000a' and user_id = 'a1000000-0000-0000-0000-00000000000c';
update public.family_members set display_name = 'Bossy'
  where family_id = 'b1000000-0000-0000-0000-00000000000a' and user_id = 'a1000000-0000-0000-0000-00000000000a';
select pg_temp.sign_out();
select is(pg_temp.name_of('a1000000-0000-0000-0000-00000000000c'), 'Mary', 'members rename themselves');
select is(pg_temp.name_of('a1000000-0000-0000-0000-00000000000a'), 'Owner', 'caregivers cannot rename others');

select pg_temp.sign_in_as('a1000000-0000-0000-0000-00000000000d');
update public.family_members set display_name = 'Hacked'
  where family_id = 'b1000000-0000-0000-0000-00000000000a';
select pg_temp.sign_out();
select is(pg_temp.name_of('a1000000-0000-0000-0000-00000000000b'), 'Grandma', 'other families cannot rename members');

select pg_temp.sign_in_as('a1000000-0000-0000-0000-00000000000c');
select throws_ok(
  $$update public.family_members set role = 'owner'
    where family_id = 'b1000000-0000-0000-0000-00000000000a' and user_id = 'a1000000-0000-0000-0000-00000000000c'$$,
  '42501',
  null,
  'members cannot change roles'
);
select throws_ok(
  $$update public.family_members set display_name = '   '
    where family_id = 'b1000000-0000-0000-0000-00000000000a' and user_id = 'a1000000-0000-0000-0000-00000000000c'$$,
  '23514',
  null,
  'names cannot be blank'
);
delete from public.family_members
  where family_id = 'b1000000-0000-0000-0000-00000000000a' and user_id = 'a1000000-0000-0000-0000-00000000000b';
select pg_temp.sign_out();
select is(
  (select count(*)::int from public.family_members where family_id = 'b1000000-0000-0000-0000-00000000000a'),
  3,
  'caregivers cannot remove other members'
);

select pg_temp.sign_in_as('a1000000-0000-0000-0000-00000000000a');
delete from public.family_members
  where family_id = 'b1000000-0000-0000-0000-00000000000a' and user_id = 'a1000000-0000-0000-0000-00000000000b';
select pg_temp.sign_out();
select is(pg_temp.name_of('a1000000-0000-0000-0000-00000000000b'), null, 'owners remove caregivers');
select is(pg_temp.name_of('a1000000-0000-0000-0000-00000000000a'), 'Owner', 'the owner stays');

select * from finish();
rollback;
