begin;
create extension if not exists pgtap with schema extensions;

select plan(10);
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
  ('a4000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'owner@custom-kinds.test', '{}', now(), now());
insert into public.families (id, name) values ('b4000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('b4000000-0000-0000-0000-00000000000a', 'a4000000-0000-0000-0000-00000000000a', 'owner', 'Owner');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('c4000000-0000-0000-0000-00000000000a', 'b4000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');

select is(
  (select array_agg(title || ':' || kind || ':' || coalesce(unit, '-') order by created_at)
   from public.custom_event_titles where baby_id = 'c4000000-0000-0000-0000-00000000000a'),
  array['Bath:note:-', 'Tummy time:duration:-', 'Vitamin drops:amount:drops', 'Skin to skin:duration:-',
        'Walk:duration:-'],
  'new babies start with suggestions that know what they capture'
);

select pg_temp.sign_in_as('a4000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$insert into public.custom_event_titles (baby_id, title, kind, unit)
    values ('c4000000-0000-0000-0000-00000000000a', 'Calpol', 'amount', 'ml')$$,
  'editors save a suggestion with a kind and unit'
);
select throws_ok(
  $$insert into public.custom_event_titles (baby_id, title, kind)
    values ('c4000000-0000-0000-0000-00000000000a', 'Pamol', 'amount')$$,
  '23514',
  null,
  'an amount suggestion needs a unit'
);
select throws_ok(
  $$insert into public.custom_event_titles (baby_id, title, kind, unit)
    values ('c4000000-0000-0000-0000-00000000000a', 'Nap walk', 'duration', 'min')$$,
  '23514',
  null,
  'only amount suggestions have a unit'
);

select lives_ok($$
  select public.save_event(jsonb_build_object(
    'id', 'd4000000-0000-0000-0000-00000000000a', 'baby_id', 'c4000000-0000-0000-0000-00000000000a', 'type', 'custom',
    'started_at', '2026-10-06T01:00:00Z', 'ended_at', '2026-10-06T01:00:00Z',
    'details', jsonb_build_object('title', 'Vitamin drops', 'description', '', 'kind', 'amount', 'amount', 2.5,
                                  'unit', ' drops ')))
$$, 'an editor logs an amount');
select is(
  (select kind || ' ' || amount || ' ' || unit from public.custom_details
   where event_id = 'd4000000-0000-0000-0000-00000000000a'),
  'amount 2.5 drops',
  'the amount and trimmed unit are saved'
);

select lives_ok($$
  select public.save_event(jsonb_build_object(
    'id', 'd4000000-0000-0000-0000-00000000000a', 'baby_id', 'c4000000-0000-0000-0000-00000000000a', 'type', 'custom',
    'started_at', '2026-10-06T01:00:00Z', 'ended_at', '2026-10-06T01:05:00Z',
    'details', jsonb_build_object('title', 'Tummy time', 'description', '', 'kind', 'duration')))
$$, 'an editor changes it to a duration');
select is(
  (select kind || coalesce(amount::text, '-') || coalesce(unit, '-') from public.custom_details
   where event_id = 'd4000000-0000-0000-0000-00000000000a'),
  'duration--',
  'changing the kind clears the amount'
);

select lives_ok($$
  select public.save_event(jsonb_build_object(
    'id', 'd4000000-0000-0000-0000-00000000000b', 'baby_id', 'c4000000-0000-0000-0000-00000000000a', 'type', 'custom',
    'started_at', '2026-10-06T02:00:00Z', 'ended_at', '2026-10-06T02:00:00Z',
    'details', jsonb_build_object('title', 'Bath', 'description', '')))
$$, 'an event saved without a kind still saves');
select is(
  (select kind::text from public.custom_details where event_id = 'd4000000-0000-0000-0000-00000000000b'),
  'note',
  'it is saved as a note'
);
select pg_temp.sign_out();

select * from finish();
rollback;
