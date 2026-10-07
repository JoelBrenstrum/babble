begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

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
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'backdate@example.com', '{}', now(), now());
insert into public.families (id, name) values ('00000000-0000-0000-0000-0000000000e2', 'Backdaters');
insert into public.family_members (family_id, user_id, role, display_name)
values ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e1', 'owner', 'Parent');
insert into public.babies (id, family_id, name, birth_date, timezone)
values ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e2', 'Baby', '2026-09-26', 'UTC');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000e1');

create temp table feed on commit drop as
  select public.start_session('00000000-0000-0000-0000-0000000000e3', 'breast_feed', 'left') as id;
grant select on feed to authenticated;

select lives_ok(
  $$ select public.set_session_start((select id from feed), now() - interval '10 minutes') $$,
  'a running feed can be backdated');
select ok(
  (select started_at = now() - interval '10 minutes' from public.events where id = (select id from feed)),
  'the feed starts earlier');
select ok(
  (select started_at = now() - interval '10 minutes' from public.timed_segments where event_id = (select id from feed)),
  'the first side starts earlier too');
select throws_ok(
  $$ select public.set_session_start((select id from feed), now() + interval '5 minutes') $$,
  '22023', 'The start can''t be in the future', 'the start cannot be in the future');

select public.switch_side((select id from feed), 'right');
select throws_ok(
  $$ select public.set_session_start((select id from feed), now() + interval '0 seconds') $$,
  '22023', 'The start must be before the first side ended', 'the start must be before the first side ended');

create temp table nap on commit drop as
  select public.start_session('00000000-0000-0000-0000-0000000000e3', 'sleep') as id;
grant select on nap to authenticated;
select lives_ok($$ select public.set_session_start((select id from nap), now() - interval '1 hour') $$, 'a nap can be backdated');
select ok((select started_at = now() - interval '1 hour' from public.events where id = (select id from nap)), 'the nap starts an hour earlier');

select public.end_session((select id from nap));
select throws_ok(
  $$ select public.set_session_start((select id from nap), now() - interval '2 hours') $$,
  '22023', 'Only a running session''s start can be changed here', 'finished sessions are edited through the entry screen');

select * from finish();
rollback;
