begin;
create extension if not exists pgtap with schema extensions;

select plan(19);
update private.instance_settings set billing_enabled = false;

insert into public.families (id, name) values
  ('a1000000-0000-0000-0000-000000000001', 'Free family'),
  ('a1000000-0000-0000-0000-000000000002', 'Plus family');
update public.families set plan = 'plus' where id = 'a1000000-0000-0000-0000-000000000002';

create function pg_temp.add_report(family uuid, report_name text)
returns void
language sql
as $$
  insert into public.reports (family_id, name, spec)
  values (family, report_name, '{"version": 1}'::jsonb);
$$;

select has_table('public', 'reports', 'reports table exists');
select lives_ok(
  $$select pg_temp.add_report('a1000000-0000-0000-0000-000000000001', 'First')$$,
  'a free family saves a first report'
);
select lives_ok(
  $$select pg_temp.add_report('a1000000-0000-0000-0000-000000000001', 'Second')$$,
  'a free family saves a second report'
);
select lives_ok(
  $$select pg_temp.add_report('a1000000-0000-0000-0000-000000000001', 'Third')$$,
  'with billing off, a free family saves more'
);

update private.instance_settings set billing_enabled = true;

select throws_ok(
  $$select pg_temp.add_report('a1000000-0000-0000-0000-000000000001', 'Fourth')$$,
  'PL008',
  'A free family can save two reports. Babble Plus saves as many as you like.',
  'with billing on, a free family at the limit cannot save another'
);
select lives_ok(
  $$update public.reports set name = 'Renamed' where family_id = 'a1000000-0000-0000-0000-000000000001' and name = 'First'$$,
  'editing a saved report never counts against the limit'
);
select lives_ok(
  $$select pg_temp.add_report('a1000000-0000-0000-0000-000000000002', 'Plus one')$$,
  'a plus family saves reports'
);
select throws_ok(
  $$insert into public.reports (family_id, name, spec) values ('a1000000-0000-0000-0000-000000000002', '', '{}'::jsonb)$$,
  '23514',
  null,
  'a report needs a name'
);

update private.instance_settings set billing_enabled = false, signup_mode = 'open';

create function pg_temp.sign_in_as(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function pg_temp.rows_changed(statement text)
returns bigint
language plpgsql
as $$
declare
  changed bigint;
begin
  execute statement;
  get diagnostics changed = row_count;
  return changed;
exception when insufficient_privilege then
  return -1;
end;
$$;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('a2000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.com', '{}', now(), now()),
  ('a2000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer@example.com', '{}', now(), now()),
  ('a2000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@example.com', '{}', now(), now());
insert into public.family_members (family_id, user_id, role, display_name) values
  ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-00000000000a', 'owner', 'Owner'),
  ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-00000000000b', 'viewer', 'Viewer'),
  ('a1000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-00000000000c', 'owner', 'Outsider');

select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000a');
select is(
  (select count(*) from public.reports where family_id = 'a1000000-0000-0000-0000-000000000001'),
  3::bigint,
  'a member reads the family reports'
);
select is(
  pg_temp.rows_changed($$ insert into public.reports (family_id, name, spec, created_by) values ('a1000000-0000-0000-0000-000000000001', 'Mine', '{"version": 1}'::jsonb, 'a2000000-0000-0000-0000-00000000000a') $$),
  1::bigint,
  'an editor saves a report in their own name'
);
select is(
  pg_temp.rows_changed($$ insert into public.reports (family_id, name, spec, created_by) values ('a1000000-0000-0000-0000-000000000001', 'Theirs', '{"version": 1}'::jsonb, 'a2000000-0000-0000-0000-00000000000b') $$),
  -1::bigint,
  'an editor cannot save a report as someone else'
);
select is(
  pg_temp.rows_changed($$ update public.reports set family_id = 'a1000000-0000-0000-0000-000000000002' where name = 'Mine' $$),
  -1::bigint,
  'a report cannot move to another family'
);
select is(
  pg_temp.rows_changed($$ delete from public.reports where name = 'Mine' $$),
  1::bigint,
  'an editor deletes a report'
);

select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000b');
select is(
  pg_temp.rows_changed($$ insert into public.reports (family_id, name, spec, created_by) values ('a1000000-0000-0000-0000-000000000001', 'Peek', '{"version": 1}'::jsonb, 'a2000000-0000-0000-0000-00000000000b') $$),
  -1::bigint,
  'a viewer cannot save a report'
);
select is(
  pg_temp.rows_changed($$ update public.reports set name = 'Renamed again' where family_id = 'a1000000-0000-0000-0000-000000000001' $$),
  0::bigint,
  'a viewer cannot rename a report'
);

select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000c');
select is(
  (select count(*) from public.reports where family_id = 'a1000000-0000-0000-0000-000000000001'),
  0::bigint,
  'a non-member sees none of the family reports'
);
select is(
  pg_temp.rows_changed($$ update public.reports set name = 'Hacked' where family_id = 'a1000000-0000-0000-0000-000000000001' $$),
  0::bigint,
  'a non-member cannot rename them'
);
select is(
  (select count(*) from public.reports where family_id = 'a1000000-0000-0000-0000-000000000001'),
  0::bigint,
  'a non-member still sees none of them after trying'
);

select is(
  pg_temp.rows_changed($$ delete from public.reports where family_id = 'a1000000-0000-0000-0000-000000000001' $$),
  0::bigint,
  'a non-member cannot delete them'
);

select * from finish();
rollback;
