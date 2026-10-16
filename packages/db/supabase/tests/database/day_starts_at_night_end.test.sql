begin;
create extension if not exists pgtap with schema extensions;

select plan(9);
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
  ('53000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'jane@daystart.test', '{}', now(), now());
insert into public.families (id, name) values ('63000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('63000000-0000-0000-0000-00000000000a', '53000000-0000-0000-0000-00000000000a', 'owner', 'Jane');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('73000000-0000-0000-0000-00000000000a', '63000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');

create function pg_temp.day_start() returns integer language sql as $$
  select day_start_minutes from public.babies where id = '73000000-0000-0000-0000-00000000000a';
$$;
create function pg_temp.night_end() returns integer language sql as $$
  select night_end_minutes from public.baby_settings where baby_id = '73000000-0000-0000-0000-00000000000a';
$$;

select pg_temp.sign_in_as('53000000-0000-0000-0000-00000000000a');

select is(pg_temp.day_start(), 0, 'a new baby''s day starts at midnight');

update public.babies set day_starts_at_night_end = true where id = '73000000-0000-0000-0000-00000000000a';
select is(pg_temp.day_start(), 420, 'choosing to start the day when the night ends uses the night end');

update public.baby_settings set night_end_minutes = 390 where baby_id = '73000000-0000-0000-0000-00000000000a';
select is(pg_temp.day_start(), 390, 'moving the night end moves the day start');

update public.babies set day_starts_at_night_end = false where id = '73000000-0000-0000-0000-00000000000a';
select is(pg_temp.day_start(), 0, 'going back to midnight resets the day start');

update public.baby_settings set night_end_minutes = 420 where baby_id = '73000000-0000-0000-0000-00000000000a';
select is(pg_temp.day_start(), 0, 'the night end leaves a midnight day start alone');

update public.babies set day_start_minutes = 360 where id = '73000000-0000-0000-0000-00000000000a';
select ok(
  (select day_starts_at_night_end from public.babies where id = '73000000-0000-0000-0000-00000000000a'),
  'an older client setting a custom day start turns the link on'
);
select is(pg_temp.night_end(), 360, 'and the night then ends when the day starts');

update public.babies set day_start_minutes = 0 where id = '73000000-0000-0000-0000-00000000000a';
select ok(
  not (select day_starts_at_night_end from public.babies where id = '73000000-0000-0000-0000-00000000000a'),
  'an older client choosing midnight turns the link off'
);

reset role;
insert into public.babies (id, family_id, name, birth_date, timezone, day_start_minutes) values
  ('73000000-0000-0000-0000-00000000000b', '63000000-0000-0000-0000-00000000000a', 'Leo', '2026-09-26', 'UTC', 330);
select is(
  (select night_end_minutes from public.baby_settings where baby_id = '73000000-0000-0000-0000-00000000000b'),
  330,
  'a baby added with a custom day start gets a matching night end'
);

select * from finish();
rollback;
