begin;
create extension if not exists pgtap with schema extensions;

select plan(38);

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

create function pg_temp.create_user(user_id uuid, email text, metadata jsonb default '{}')
returns void
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, metadata, now(), now());
$$;

-- Users: John (owner), Jane (joins by invite), Grandma (viewer), Stranger (another family)
select pg_temp.create_user('00000000-0000-0000-0000-00000000000a', 'john@example.com');
select throws_ok(
  $$ select pg_temp.create_user('00000000-0000-0000-0000-00000000000b', 'jane@example.com') $$,
  'P0001',
  'Sign-up on this Babble server requires a valid invite code',
  'invite-only rejects a sign-up without an invite code'
);

select pg_temp.sign_in_as('00000000-0000-0000-0000-00000000000a');

select isnt(
  (select public.create_family('Smith', 'John')),
  null,
  'a signed-in user can create a family'
);
select is(
  (select role::text from public.family_members where user_id = '00000000-0000-0000-0000-00000000000a'),
  'owner',
  'the creator is the owner'
);
create temp table family on commit drop as select id from public.families;
grant select on family to anon, authenticated;

insert into public.babies (family_id, name, birth_date, timezone)
select id, 'Olivia', '2026-09-26', 'Pacific/Auckland' from public.families;
select is((select count(*)::int from public.babies), 1, 'an owner can add a baby');
select is(
  (select downtime_merge_threshold_sec from public.baby_settings),
  15,
  'baby settings are created with defaults'
);

select throws_ok(
  $$ insert into public.babies (family_id, name, birth_date, timezone)
     values ((select id from family), 'Bad', '2026-09-26', 'Mars/Olympus') $$,
  '23514',
  null,
  'an invalid timezone is rejected'
);

select throws_ok(
  $$ update public.families set plan = 'plus' $$,
  '42501',
  null,
  'owners cannot change their plan'
);
select lives_ok($$ update public.families set name = 'The Smiths' $$, 'owners can rename their family');

create temp table invite on commit drop as select * from public.create_invite((select id from family));
grant select on invite to anon, authenticated;
select matches((select code from invite), '^[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$', 'invite codes look like K7Q-4MD');
select ok(
  (select expires_at between now() + interval '6 days 23 hours' and now() + interval '7 days 1 hour' from invite),
  'invites expire in 7 days'
);

create temp table viewer_invite on commit drop as
  select * from public.create_invite((select id from family), 'viewer');
grant select on viewer_invite to anon, authenticated;

select throws_ok(
  $$ select public.create_invite((select id from family), 'owner') $$,
  '23514',
  null,
  'invites cannot grant the owner role'
);

select pg_temp.sign_out();

select lives_ok(
  format(
    $$ select pg_temp.create_user('00000000-0000-0000-0000-00000000000b', 'jane@example.com', %L) $$,
    json_build_object('invite_code', lower((select code from invite)))
  ),
  'invite-only accepts a sign-up with a valid invite code, case-insensitively'
);
select lives_ok(
  format(
    $$ select pg_temp.create_user('00000000-0000-0000-0000-00000000000c', 'grandma@example.com', %L) $$,
    json_build_object('invite_code', (select code from viewer_invite))
  ),
  'a second invite works for a second user'
);

set local role anon;
select is(
  (select family_name from public.check_invite((select code from invite))),
  'The Smiths',
  'anyone can check an invite code before signing up'
);
select is(
  (select signup_mode::text from public.get_instance_settings()),
  'invite_only',
  'anyone can read the signup mode'
);
select throws_ok($$ select * from public.babies $$, '42501', null, 'anonymous users cannot read babies');
reset role;

select pg_temp.sign_in_as('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.babies), 0, 'non-members see no babies');
select is(
  public.accept_invite((select code from invite), 'Jane'),
  (select id from family),
  'accepting an invite joins the family'
);
select is((select count(*)::int from public.babies), 1, 'members see the family''s babies');
select is(
  (select role::text from public.family_members where user_id = '00000000-0000-0000-0000-00000000000b'),
  'caregiver',
  'the invite grants the caregiver role'
);
select lives_ok(
  $$ update public.baby_settings set downtime_merge_threshold_sec = 20 $$,
  'caregivers can change baby settings'
);
select is((select downtime_merge_threshold_sec from public.baby_settings), 20, 'the settings change was saved');
select is((select count(*)::int from public.family_invites), 2, 'caregivers can see the family''s invites');

select pg_temp.sign_in_as('00000000-0000-0000-0000-00000000000c');
select throws_ok(
  $$ select public.accept_invite((select code from invite), 'Grandma') $$,
  'P0002',
  'This invite code is invalid, used or expired',
  'a used invite code cannot be reused'
);
select lives_ok(
  $$ select public.accept_invite((select code from viewer_invite), 'Grandma') $$,
  'a viewer invite can be accepted'
);
update public.babies set name = 'Changed';
select is((select name from public.babies), 'Olivia', 'viewers cannot update babies');
select throws_ok(
  $$ select public.create_invite((select id from family)) $$,
  '42501',
  'Only owners and caregivers can invite',
  'viewers cannot create invites'
);
select is((select count(*)::int from public.family_invites), 0, 'viewers cannot see invites');

select pg_temp.sign_out();
update private.instance_settings set signup_mode = 'open';
select lives_ok(
  $$ select pg_temp.create_user('00000000-0000-0000-0000-00000000000d', 'stranger@example.com') $$,
  'open signup mode accepts sign-ups without an invite'
);

select pg_temp.sign_in_as('00000000-0000-0000-0000-00000000000d');
select public.create_family('Strangers', 'Stranger');
select is((select count(*)::int from public.families), 1, 'users only see their own families');
select is((select count(*)::int from public.babies), 0, 'users cannot see other families'' babies');
select is((select count(*)::int from public.family_members), 1, 'users cannot see other families'' members');
select throws_ok(
  $$ insert into public.babies (family_id, name, birth_date, timezone)
     values ((select id from family), 'Intruder', '2026-09-26', 'UTC') $$,
  '42501',
  null,
  'users cannot add babies to other families'
);
update public.baby_settings set downtime_merge_threshold_sec = 99;
delete from public.family_members where user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.sign_out();
select is(
  (select downtime_merge_threshold_sec from public.baby_settings),
  20,
  'users cannot change other families'' settings'
);
select is(
  (select count(*)::int from public.family_members where user_id = '00000000-0000-0000-0000-00000000000a'),
  1,
  'users cannot remove members of other families'
);

select pg_temp.sign_in_as('00000000-0000-0000-0000-00000000000a');
select public.delete_my_account();
select pg_temp.sign_out();
select is(
  (select role::text from public.family_members where user_id = '00000000-0000-0000-0000-00000000000b'),
  'owner',
  'when the last owner leaves, a caregiver is promoted to owner'
);
select is((select count(*)::int from public.babies), 1, 'the baby stays with the family after the owner leaves');

select pg_temp.sign_in_as('00000000-0000-0000-0000-00000000000d');
select public.delete_my_account();
select pg_temp.sign_out();
select is(
  (select count(*)::int from public.families where name = 'Strangers'),
  0,
  'a family is deleted when its last member leaves'
);

select * from finish();
rollback;
