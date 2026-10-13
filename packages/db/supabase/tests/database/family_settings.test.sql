begin;
create extension if not exists pgtap with schema extensions;

select plan(11);
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
  ('f2000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'carer@settings.test', '{}', now(), now()),
  ('f2000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'viewer@settings.test', '{}', now(), now()),
  ('f2000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'stranger@settings.test', '{}', now(), now()),
  ('f2000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'admin@settings.test', '{}', now(), now());
insert into public.families (id, name) values ('f3000000-0000-0000-0000-00000000000a', 'Settings family');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('f3000000-0000-0000-0000-00000000000a', 'f2000000-0000-0000-0000-00000000000d', 'owner', 'Admin'),
  ('f3000000-0000-0000-0000-00000000000a', 'f2000000-0000-0000-0000-00000000000a', 'caregiver', 'Carer'),
  ('f3000000-0000-0000-0000-00000000000a', 'f2000000-0000-0000-0000-00000000000b', 'viewer', 'Viewer');

select is(
  (select units::text from public.family_settings where family_id = 'f3000000-0000-0000-0000-00000000000a'),
  'metric',
  'a new family gets default settings'
);

insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('f4000000-0000-0000-0000-00000000000a', 'f3000000-0000-0000-0000-00000000000a', 'Ada', current_date,
   'Pacific/Auckland');

select is(
  (select count(*)::int from public.baby_settings where baby_id = 'f4000000-0000-0000-0000-00000000000a'),
  1,
  'a new baby gets its own settings row'
);

select hasnt_column('public', 'baby_settings', 'units', 'units live only on the family');
select hasnt_column('public', 'baby_settings', 'downtime_merge_threshold_sec', 'the merge gap lives only on the family');
select hasnt_column('public', 'baby_settings', 'auto_end_paused_session_min', 'auto-end lives only on the family');

select pg_temp.sign_in_as('f2000000-0000-0000-0000-00000000000a');
update public.family_settings set units = 'imperial' where family_id = 'f3000000-0000-0000-0000-00000000000a';
select pg_temp.sign_out();
select is(
  (select units::text from public.family_settings where family_id = 'f3000000-0000-0000-0000-00000000000a'),
  'metric',
  'a caregiver cannot change family settings'
);

select pg_temp.sign_in_as('f2000000-0000-0000-0000-00000000000d');
select lives_ok(
  $$ update public.family_settings set units = 'imperial', auto_end_paused_session_min = 45
     where family_id = 'f3000000-0000-0000-0000-00000000000a' $$,
  'an admin can change family settings'
);
select pg_temp.sign_out();
select is(
  (select units::text || auto_end_paused_session_min from public.family_settings
   where family_id = 'f3000000-0000-0000-0000-00000000000a'),
  'imperial45',
  'the family settings change was saved'
);

select pg_temp.sign_in_as('f2000000-0000-0000-0000-00000000000b');
update public.family_settings set units = 'metric' where family_id = 'f3000000-0000-0000-0000-00000000000a';
select pg_temp.sign_out();
select is(
  (select units::text from public.family_settings where family_id = 'f3000000-0000-0000-0000-00000000000a'),
  'imperial',
  'a viewer cannot change family settings'
);

select pg_temp.sign_in_as('f2000000-0000-0000-0000-00000000000c');
select is_empty(
  $$ select 1 from public.family_settings where family_id = 'f3000000-0000-0000-0000-00000000000a' $$,
  'someone outside the family cannot read its settings'
);
select pg_temp.sign_out();

select is(
  (select count(*)::int from public.families f
   where not exists (select 1 from public.family_settings fs where fs.family_id = f.id)),
  0,
  'every family has settings'
);

select * from finish();
rollback;
