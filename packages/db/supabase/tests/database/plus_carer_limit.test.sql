begin;
create extension if not exists pgtap with schema extensions;

select plan(8);
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

update private.instance_settings set signup_mode = 'open';
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('d1000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'owner@carers.test', '{}', now(), now()),
  ('d1000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'second@carers.test', '{}', now(), now()),
  ('d1000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'third@carers.test', '{}', now(), now()),
  ('d1000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'plus@carers.test', '{}', now(), now());
insert into public.families (id, name, plan) values
  ('e1000000-0000-0000-0000-00000000000a', 'Free family', 'free'),
  ('e1000000-0000-0000-0000-00000000000b', 'Plus family', 'plus');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('e1000000-0000-0000-0000-00000000000a', 'd1000000-0000-0000-0000-00000000000a', 'owner', 'Owner'),
  ('e1000000-0000-0000-0000-00000000000b', 'd1000000-0000-0000-0000-00000000000d', 'owner', 'Plus owner'),
  ('e1000000-0000-0000-0000-00000000000b', 'd1000000-0000-0000-0000-00000000000b', 'caregiver', 'Second');
update private.instance_settings set billing_enabled = true;

select pg_temp.sign_in_as('d1000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$select public.create_invite('e1000000-0000-0000-0000-00000000000a')$$,
  'a free family of one can invite a second carer'
);
select throws_ok(
  $$select public.create_invite('e1000000-0000-0000-0000-00000000000a')$$,
  'PL002',
  'A free family can have two carers',
  'a pending invite counts towards the two'
);

select pg_temp.sign_out();
select set_config('test.code', (select code from public.family_invites where family_id = 'e1000000-0000-0000-0000-00000000000a'), true);
select pg_temp.sign_in_as('d1000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$select public.accept_invite(current_setting('test.code'), 'Second')$$,
  'the second carer joins'
);

select pg_temp.sign_out();
update private.instance_settings set billing_enabled = false;
insert into public.family_invites (family_id, code, created_by) values
  ('e1000000-0000-0000-0000-00000000000a', 'CARER-OLD01', 'd1000000-0000-0000-0000-00000000000a');
update private.instance_settings set billing_enabled = true;

select pg_temp.sign_in_as('d1000000-0000-0000-0000-00000000000c');
select throws_ok(
  $$select public.accept_invite('CARER-OLD01', 'Third')$$,
  'PL002',
  'A free family can have two carers',
  'an invite made before billing was on cannot add a third carer'
);

select pg_temp.sign_in_as('d1000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$select public.create_invite('e1000000-0000-0000-0000-00000000000a')$$,
  'PL002',
  'A free family can have two carers',
  'a full free family cannot invite'
);

select pg_temp.sign_in_as('d1000000-0000-0000-0000-00000000000d');
select lives_ok(
  $$select public.create_invite('e1000000-0000-0000-0000-00000000000b')$$,
  'a plus family invites a third carer'
);

select pg_temp.sign_out();
update private.instance_settings set billing_enabled = false;
select pg_temp.sign_in_as('d1000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$select public.create_invite('e1000000-0000-0000-0000-00000000000a')$$,
  'with billing off there is no limit'
);
select pg_temp.sign_out();
select is(
  (select count(*)::int from public.family_members where family_id = 'e1000000-0000-0000-0000-00000000000a'),
  2,
  'the free family kept its two carers'
);

select * from finish();
rollback;
