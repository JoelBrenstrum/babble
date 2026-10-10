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

select lives_ok($$
  select public.save_event(jsonb_build_object(
    'id', '00000000-0000-0000-0000-0000000000c1', 'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'solids',
    'started_at', '2026-10-06T01:00:00Z', 'ended_at', '2026-10-06T01:00:00Z',
    'details', jsonb_build_object('foods', jsonb_build_array(' Avocado ', 'Banana'), 'amount', 'some', 'reaction', 'loved')))
$$, 'a caregiver saves solids');
select is(
  (select foods::text from public.solids_details where event_id = '00000000-0000-0000-0000-0000000000c1'),
  '{Avocado,Banana}', 'foods are trimmed and kept in order');
select is(
  (select amount::text || ' ' || reaction::text from public.solids_details where event_id = '00000000-0000-0000-0000-0000000000c1'),
  'some loved', 'amount and reaction are saved');

select lives_ok($$
  select public.save_event(jsonb_build_object(
    'id', '00000000-0000-0000-0000-0000000000c1', 'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'solids',
    'started_at', '2026-10-06T01:00:00Z', 'ended_at', '2026-10-06T01:00:00Z',
    'details', jsonb_build_object('foods', jsonb_build_array('Pear'))))
$$, 'editing solids replaces the details');
select is(
  (select foods::text || coalesce(amount::text, '-') || coalesce(reaction::text, '-')
   from public.solids_details where event_id = '00000000-0000-0000-0000-0000000000c1'),
  '{Pear}--', 'cleared amount and reaction are saved as empty');

select throws_ok($$
  select public.save_event(jsonb_build_object(
    'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'solids',
    'started_at', '2026-10-06T02:00:00Z', 'ended_at', '2026-10-06T02:00:00Z',
    'details', jsonb_build_object('foods', '[]'::jsonb)))
$$, '23514', null, 'solids need at least one food');
select throws_ok($$
  select public.save_event(jsonb_build_object(
    'baby_id', '00000000-0000-0000-0000-0000000000b1', 'type', 'solids',
    'started_at', '2026-10-06T02:00:00Z', 'ended_at', '2026-10-06T02:00:00Z',
    'details', jsonb_build_object('foods', jsonb_build_array(repeat('a', 41)))))
$$, '23514', null, 'food names are limited to 40 characters');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000a3');
select is(
  (select foods::text from public.solids_details where event_id = '00000000-0000-0000-0000-0000000000c1'),
  '{Pear}', 'viewers can read solids');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000a4');
select is((select count(*)::int from public.solids_details), 0, 'outsiders cannot see solids');

select * from finish();
rollback;
