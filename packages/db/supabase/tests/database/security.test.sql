begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

create function pg_temp.sign_in_as(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function pg_temp.create_user(user_id uuid, email text, metadata jsonb default '{}')
returns void
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, metadata, now(), now());
$$;

update private.instance_settings set signup_mode = 'open';
select pg_temp.create_user('10000000-0000-0000-0000-00000000000a', 'owner@security.test');
select pg_temp.create_user('10000000-0000-0000-0000-00000000000b', 'carer@security.test');

insert into public.families (id, name) values
  ('20000000-0000-0000-0000-00000000000a', 'Home'),
  ('20000000-0000-0000-0000-00000000000b', 'Elsewhere');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'owner', 'Owner'),
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b', 'caregiver', 'Carer'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'owner', 'Carer');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');
insert into public.events (id, baby_id, type, started_at, ended_at) values
  ('40000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'nappy', now(), now()),
  ('40000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000a', 'nappy', now() - interval '1 hour', now() - interval '1 hour');
insert into public.nappy_details (event_id, wet) values ('40000000-0000-0000-0000-00000000000a', true);

select pg_temp.sign_in_as('10000000-0000-0000-0000-00000000000b');

select throws_ok(
  $$ update public.babies set family_id = '20000000-0000-0000-0000-00000000000b'
     where id = '30000000-0000-0000-0000-00000000000a' $$,
  '42501',
  null,
  'a caregiver cannot move a baby to another family'
);
select lives_ok(
  $$ update public.babies set name = 'Liv', sex = 'female' where id = '30000000-0000-0000-0000-00000000000a' $$,
  'a caregiver can still edit the baby''s details'
);
select throws_ok(
  $$ insert into public.babies (id, family_id, name, birth_date, timezone, created_at)
     values (gen_random_uuid(), '20000000-0000-0000-0000-00000000000a', 'Twin', '2026-09-26', 'UTC', now()) $$,
  '42501',
  null,
  'a baby''s id and timestamps are set by the server'
);
select throws_ok(
  $$ update public.baby_settings set baby_id = '30000000-0000-0000-0000-00000000000a' $$,
  '42501',
  null,
  'baby settings cannot be moved to another baby'
);
select lives_ok(
  $$ update public.baby_settings set units = 'imperial' where baby_id = '30000000-0000-0000-0000-00000000000a' $$,
  'baby settings can still be changed'
);
select throws_ok(
  $$ update public.nappy_details set event_id = '40000000-0000-0000-0000-00000000000b' $$,
  '42501',
  null,
  'entry details cannot be moved to another entry'
);
select lives_ok(
  $$ update public.nappy_details set dirty = true where event_id = '40000000-0000-0000-0000-00000000000a' $$,
  'entry details can still be edited'
);
select throws_ok(
  $$ insert into public.events (baby_id, type, started_at, ended_at, created_at)
     values ('30000000-0000-0000-0000-00000000000a', 'custom', now(), now(), now() - interval '5 years') $$,
  '42501',
  null,
  'an entry''s created time cannot be forged'
);
select lives_ok(
  $$ insert into public.events (baby_id, type, started_at, ended_at)
     values ('30000000-0000-0000-0000-00000000000a', 'custom', now(), now()) $$,
  'entries can still be added'
);

reset role;

select ok(
  not has_function_privilege('authenticated', 'private.valid_invite(text)', 'execute')
    and not has_function_privilege('anon', 'private.generate_invite_code()', 'execute'),
  'internal functions are not callable by clients'
);
select ok(
  has_function_privilege('authenticated', 'private.can_edit_family(uuid)', 'execute'),
  'the helpers used by row security stay callable'
);

update private.instance_settings set signup_mode = 'invite_only';
select pg_temp.sign_in_as('10000000-0000-0000-0000-00000000000a');
create temp table invite on commit drop as
  select * from public.create_invite('20000000-0000-0000-0000-00000000000a');
grant select on invite to authenticated;
reset role;

select lives_ok(
  format(
    $$ select pg_temp.create_user('10000000-0000-0000-0000-00000000000c', 'first@security.test', %L) $$,
    json_build_object('invite_code', (select code from invite))
  ),
  'an invite code lets one person sign up'
);
select throws_ok(
  format(
    $$ select pg_temp.create_user('10000000-0000-0000-0000-00000000000d', 'second@security.test', %L) $$,
    json_build_object('invite_code', (select code from invite))
  ),
  'P0001',
  'Sign-up on this Babble server requires a valid invite code',
  'the same invite code cannot sign up a second person'
);

select pg_temp.sign_in_as('10000000-0000-0000-0000-00000000000c');
select is(
  public.accept_invite((select code from invite), 'First'),
  '20000000-0000-0000-0000-00000000000a'::uuid,
  'the person who signed up with the code can still join'
);

select * from finish();
rollback;
