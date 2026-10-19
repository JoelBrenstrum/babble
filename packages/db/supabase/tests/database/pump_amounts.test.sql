begin;
create extension if not exists pgtap with schema extensions;

select plan(6);
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
  ('51000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carer@pump.test', '{}', now(), now()),
  ('51000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'viewer@pump.test', '{}', now(), now());
insert into public.families (id, name) values ('61000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('61000000-0000-0000-0000-00000000000a', '51000000-0000-0000-0000-00000000000a', 'owner', 'Carer'),
  ('61000000-0000-0000-0000-00000000000a', '51000000-0000-0000-0000-00000000000b', 'viewer', 'Viewer');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('71000000-0000-0000-0000-00000000000a', '61000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');
insert into public.events (id, baby_id, type, started_at) values
  ('81000000-0000-0000-0000-00000000000a', '71000000-0000-0000-0000-00000000000a', 'pump', now() - interval '10 minutes'),
  ('81000000-0000-0000-0000-00000000000b', '71000000-0000-0000-0000-00000000000a', 'sleep', now() - interval '10 minutes');
insert into public.pump_details (event_id, total_ml) values ('81000000-0000-0000-0000-00000000000a', 90);

select pg_temp.sign_in_as('51000000-0000-0000-0000-00000000000a');

select lives_ok(
  $$ select public.save_pump_amounts('81000000-0000-0000-0000-00000000000a', '{"left_ml": 40}') $$,
  'a side can be saved while pumping'
);
select lives_ok(
  $$ select public.save_pump_amounts('81000000-0000-0000-0000-00000000000a', '{"right_ml": 60}') $$,
  'the other side can be saved on its own'
);
select is(
  (select row(left_ml, right_ml, total_ml) from public.pump_details where event_id = '81000000-0000-0000-0000-00000000000a'),
  row(40, 60, null::integer),
  'each side is kept and the old total is cleared'
);
select is(
  (select ended_at from public.events where id = '81000000-0000-0000-0000-00000000000a'),
  null,
  'the pump keeps running'
);
select throws_ok(
  $$ select public.save_pump_amounts('81000000-0000-0000-0000-00000000000b', '{"left_ml": 10}') $$,
  'P0002',
  'Pump not found',
  'other event types are refused'
);

select pg_temp.sign_in_as('51000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$ select public.save_pump_amounts('81000000-0000-0000-0000-00000000000a', '{"left_ml": 10}') $$,
  'P0002',
  'Pump not found',
  'a viewer cannot change the amounts'
);

select * from finish();
rollback;
