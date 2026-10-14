begin;
create extension if not exists pgtap with schema extensions;

select plan(5);
update private.instance_settings set billing_enabled = false;

create function pg_temp.sign_in_as(user_id uuid, device text)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  perform set_config('request.headers', json_build_object('x-babble-device', device)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

update private.instance_settings set signup_mode = 'open';
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('52000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'jane@devices.test', '{}', now(), now());
insert into public.families (id, name) values ('62000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('62000000-0000-0000-0000-00000000000a', '52000000-0000-0000-0000-00000000000a', 'owner', 'Jane');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('72000000-0000-0000-0000-00000000000a', '62000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');

select pg_temp.sign_in_as('52000000-0000-0000-0000-00000000000a', 'Chair');
insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('82000000-0000-0000-0000-00000000000a', '72000000-0000-0000-0000-00000000000a', 'nappy', now(), now());
select is(
  (select created_device from public.events where id = '82000000-0000-0000-0000-00000000000a'),
  'Chair',
  'an entry records the device it was logged on'
);

select pg_temp.sign_in_as('52000000-0000-0000-0000-00000000000a', '   ');
insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('82000000-0000-0000-0000-00000000000b', '72000000-0000-0000-0000-00000000000a', 'nappy', now(), now());
select is(
  (select created_device from public.events where id = '82000000-0000-0000-0000-00000000000b'),
  null,
  'a blank device name is not recorded'
);

select pg_temp.sign_in_as('52000000-0000-0000-0000-00000000000a', repeat('x', 100));
insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('82000000-0000-0000-0000-00000000000c', '72000000-0000-0000-0000-00000000000a', 'nappy', now(), now());
select is(
  (select char_length(created_device) from public.events where id = '82000000-0000-0000-0000-00000000000c'),
  60,
  'long device names are shortened'
);

select throws_ok(
  $$ insert into public.events (baby_id, type, started_at, created_device)
     values ('72000000-0000-0000-0000-00000000000a', 'nappy', now(), 'Fake') $$,
  '42501', null,
  'clients cannot set the device directly'
);
select throws_ok(
  $$ update public.events set created_device = 'Fake' where id = '82000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'clients cannot change the device later'
);

select * from finish();
rollback;
