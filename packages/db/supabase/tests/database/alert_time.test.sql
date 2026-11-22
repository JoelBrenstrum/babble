begin;
create extension if not exists pgtap with schema extensions;

select plan(14);
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
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'john@example.com', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jane@example.com', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gran@example.com', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'stranger@example.com', '{}', now(), now());

insert into public.families (id, name) values
  ('00000000-0000-0000-0000-0000000000f1', 'The Smiths'),
  ('00000000-0000-0000-0000-0000000000f2', 'Strangers');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'owner', 'John'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'caregiver', 'Jane'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'viewer', 'Gran'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000a4', 'owner', 'Stranger');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 'Olivia', '2026-09-26', 'Pacific/Auckland');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000a2');

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;

insert into ids
select 'first', public.start_session('00000000-0000-0000-0000-0000000000b1', 'alert', null, now() - interval '40 minutes');
select is(
  (select activities::text || coalesce(ended_by::text, '-') from public.alert_details
   where event_id = (select id from ids where name = 'first')),
  '{}-', 'starting alert time adds empty details');
select is(
  public.start_session('00000000-0000-0000-0000-0000000000b1', 'alert'),
  (select id from ids where name = 'first'), 'only one alert period runs at a time');

select lives_ok($$
  select public.save_alert_details((select id from ids where name = 'first'),
    jsonb_build_object('activities', jsonb_build_array('tummy_time', 'reading'), 'notes', ' Loved the mirror '))
$$, 'activities are saved while it runs');
select is(
  (select d.activities::text || ' ' || e.notes from public.alert_details d join public.events e on e.id = d.event_id
   where d.event_id = (select id from ids where name = 'first')),
  '{tummy_time,reading} Loved the mirror', 'activities and notes are saved');

select is(
  public.end_alert((select id from ids where name = 'first'), 'fussy', now() - interval '10 minutes'),
  null, 'ending without falling asleep starts nothing');
select is(
  (select ended_by::text from public.alert_details where event_id = (select id from ids where name = 'first')),
  'fussy', 'what ended it is saved');
select is(
  (select ended_at from public.events where id = (select id from ids where name = 'first')),
  now() - interval '10 minutes', 'it ends at the chosen time');
select is(
  (select count(*)::int from public.events where type = 'sleep' and ended_at is null),
  0, 'no nap was started');

insert into ids
select 'second', public.start_session('00000000-0000-0000-0000-0000000000b1', 'alert', null, now() - interval '8 minutes');
insert into ids
select 'nap', public.end_alert((select id from ids where name = 'second'), 'asleep', now() - interval '2 minutes');
select is(
  (select started_at from public.events where id = (select id from ids where name = 'nap') and type = 'sleep'
     and ended_at is null),
  now() - interval '2 minutes', 'falling asleep starts a nap when alert time ended');

insert into ids
select 'third', public.start_session('00000000-0000-0000-0000-0000000000b1', 'alert', null, now() - interval '1 minute');
select throws_ok(
  format('select public.end_alert(%L, null, now() - interval ''5 minutes'')', (select id from ids where name = 'third')),
  '22023', null, 'alert time cannot end before it started');

select public.end_session((select id from ids where name = 'nap'));
select public.start_session('00000000-0000-0000-0000-0000000000b1', 'sleep');
select is(
  (select d.ended_by::text || ' ' || (e.ended_at is not null)::text from public.alert_details d
   join public.events e on e.id = d.event_id where d.event_id = (select id from ids where name = 'third')),
  'asleep true', 'starting a nap ends running alert time as fell asleep');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000a3');
select throws_ok(
  format('select public.save_alert_details(%L, ''{"activities":["bath"]}'')', (select id from ids where name = 'first')),
  'P0002', null, 'viewers cannot change alert time');
select is(
  (select count(*)::int from public.alert_details), 3, 'viewers can read alert time');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.alert_details), 0, 'outsiders cannot see alert time');

select * from finish();
rollback;
