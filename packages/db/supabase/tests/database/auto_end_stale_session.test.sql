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

update private.instance_settings set signup_mode = 'open';
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('55000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carer@auto-end.test', '{}', now(), now()),
  ('55000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'stranger@auto-end.test', '{}', now(), now());
insert into public.families (id, name) values ('65000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('65000000-0000-0000-0000-00000000000a', '55000000-0000-0000-0000-00000000000a', 'owner', 'Carer');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('75000000-0000-0000-0000-00000000000a', '65000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC'),
  ('75000000-0000-0000-0000-00000000000b', '65000000-0000-0000-0000-00000000000a', 'Noah', '2026-09-26', 'UTC');
update public.family_settings set auto_end_paused_session_min = 60
where family_id = '65000000-0000-0000-0000-00000000000a';

insert into public.events (id, baby_id, type, started_at) values
  ('85000000-0000-0000-0000-00000000000a', '75000000-0000-0000-0000-00000000000a', 'breast_feed', now() - interval '3 hours'),
  ('85000000-0000-0000-0000-00000000000b', '75000000-0000-0000-0000-00000000000a', 'sleep', now() - interval '2 hours'),
  ('85000000-0000-0000-0000-00000000000c', '75000000-0000-0000-0000-00000000000a', 'pump', now() - interval '4 hours'),
  ('85000000-0000-0000-0000-00000000000d', '75000000-0000-0000-0000-00000000000b', 'sleep', now() - interval '5 hours'),
  ('85000000-0000-0000-0000-00000000000e', '75000000-0000-0000-0000-00000000000b', 'pump', now() - interval '4 hours');
insert into public.session_details (event_id, state) values
  ('85000000-0000-0000-0000-00000000000a', 'running'),
  ('85000000-0000-0000-0000-00000000000b', 'paused'),
  ('85000000-0000-0000-0000-00000000000c', 'paused'),
  ('85000000-0000-0000-0000-00000000000d', 'running'),
  ('85000000-0000-0000-0000-00000000000e', 'paused');
insert into public.timed_segments (event_id, side, started_at, ended_at) values
  ('85000000-0000-0000-0000-00000000000a', 'left', now() - interval '3 hours', now() - interval '150 minutes'),
  ('85000000-0000-0000-0000-00000000000a', 'right', now() - interval '5 minutes', null),
  ('85000000-0000-0000-0000-00000000000b', null, now() - interval '2 hours', now() - interval '45 minutes'),
  ('85000000-0000-0000-0000-00000000000c', 'left', now() - interval '4 hours', now() - interval '90 minutes'),
  ('85000000-0000-0000-0000-00000000000e', 'left', now() - interval '4 hours', now() - interval '90 minutes');

select pg_temp.sign_in_as('55000000-0000-0000-0000-00000000000a');

select is(
  public.auto_end_stale_session('85000000-0000-0000-0000-00000000000a'),
  false,
  'a feed resumed since a device last saw it paused is left running'
);
select ok(
  (select ended_at is null from public.events where id = '85000000-0000-0000-0000-00000000000a'),
  'the resumed feed has no end'
);

select is(
  public.auto_end_stale_session('85000000-0000-0000-0000-00000000000b'),
  false,
  'a nap paused for less than the family''s limit is left alone, whatever the device thinks the limit is'
);

select is(
  public.auto_end_stale_session('85000000-0000-0000-0000-00000000000c'),
  true,
  'a pump paused for longer than the limit is ended'
);
select ok(
  (select ended_at = now() - interval '90 minutes' from public.events where id = '85000000-0000-0000-0000-00000000000c'),
  'the auto-ended pump ends when it was paused'
);
select is(
  public.auto_end_stale_session('85000000-0000-0000-0000-00000000000c'),
  false,
  'asking again about an ended session does nothing'
);

select is(
  public.auto_end_stale_session('85000000-0000-0000-0000-00000000000d'),
  false,
  'a nap that was never paused is still asleep'
);

select pg_temp.sign_in_as('55000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$ select public.auto_end_stale_session('85000000-0000-0000-0000-00000000000e') $$,
  'P0002',
  'Session not found',
  'someone outside the family cannot end its sessions'
);

set local role anon;
select throws_ok(
  $$ select public.auto_end_stale_session('85000000-0000-0000-0000-00000000000e') $$,
  '42501',
  null,
  'signed-out callers cannot use it'
);

reset role;
select ok(
  (select ended_at is null from public.events where id = '85000000-0000-0000-0000-00000000000e'),
  'a stale session in another family is left running'
);

select * from finish();
rollback;
