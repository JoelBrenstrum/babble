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
  ('54000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'jane@ended-device.test', '{}', now(), now());
insert into public.families (id, name) values ('64000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('64000000-0000-0000-0000-00000000000a', '54000000-0000-0000-0000-00000000000a', 'owner', 'Jane');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('74000000-0000-0000-0000-00000000000a', '64000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');

select pg_temp.sign_in_as('54000000-0000-0000-0000-00000000000a', 'Phone');
insert into public.events (id, baby_id, type, started_at) values
  ('84000000-0000-0000-0000-00000000000a', '74000000-0000-0000-0000-00000000000a', 'sleep', now() - interval '40 minutes');
insert into public.session_details (event_id) values ('84000000-0000-0000-0000-00000000000a');

select pg_temp.sign_in_as('54000000-0000-0000-0000-00000000000a', 'Chair');
select public.end_session('84000000-0000-0000-0000-00000000000a', now() - interval '10 minutes');
select is(
  (select ended_device from public.events where id = '84000000-0000-0000-0000-00000000000a'),
  'Chair',
  'ending a nap records the device it was ended on'
);

select throws_ok(
  $$ update public.events set ended_device = 'Fake' where id = '84000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'clients cannot change the device an entry was ended on'
);

select pg_temp.sign_in_as('54000000-0000-0000-0000-00000000000a', 'Laptop');
update public.events set ended_at = now() - interval '5 minutes' where id = '84000000-0000-0000-0000-00000000000a';
select is(
  (select ended_device from public.events where id = '84000000-0000-0000-0000-00000000000a'),
  'Chair',
  'editing the end later keeps the device that ended it'
);

update public.events set ended_at = null where id = '84000000-0000-0000-0000-00000000000a';
select is(
  (select ended_device from public.events where id = '84000000-0000-0000-0000-00000000000a'),
  null,
  'reopening an entry clears the device that ended it'
);

insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('84000000-0000-0000-0000-00000000000b', '74000000-0000-0000-0000-00000000000a', 'sleep',
   now() - interval '3 hours', now() - interval '2 hours');
select is(
  (select ended_device from public.events where id = '84000000-0000-0000-0000-00000000000b'),
  null,
  'a nap logged after the fact has no ending device'
);

select * from finish();
rollback;
