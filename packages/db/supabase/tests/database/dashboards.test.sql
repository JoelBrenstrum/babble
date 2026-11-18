begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

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

update private.instance_settings set signup_mode = 'open';
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('a2000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.com', '{}', now(), now()),
  ('a2000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'viewer@example.com', '{}', now(), now());
insert into public.families (id, name) values ('a1000000-0000-0000-0000-000000000001', 'Family');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-00000000000a', 'owner', 'Owner'),
  ('a1000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-00000000000b', 'viewer', 'Viewer');

select has_table('public', 'dashboards', 'dashboards table exists');

select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000a');
select is(
  pg_temp.rows_changed($$ insert into public.dashboards (family_id, layout) values ('a1000000-0000-0000-0000-000000000001', '{"version": 1, "cards": []}'::jsonb) on conflict (family_id) do update set layout = excluded.layout $$),
  1::bigint,
  'an editor creates the family dashboard with an upsert'
);
select is(
  pg_temp.rows_changed($$ insert into public.dashboards (family_id, layout) values ('a1000000-0000-0000-0000-000000000001', '{"version": 1, "cards": [{"id": "n", "kind": "text", "body": "Hi", "size": "s"}]}'::jsonb) on conflict (family_id) do update set family_id = excluded.family_id, layout = excluded.layout $$),
  1::bigint,
  'an editor replaces the layout with the same upsert the app sends'
);
select is(
  (select layout -> 'cards' -> 0 ->> 'body' from public.dashboards where family_id = 'a1000000-0000-0000-0000-000000000001'),
  'Hi',
  'the replaced layout is stored'
);

select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000b');
select is(
  (select count(*)::int from public.dashboards),
  1,
  'a viewer reads the dashboard'
);
select is(
  pg_temp.rows_changed($$ update public.dashboards set layout = '{"version": 1, "cards": []}'::jsonb where family_id = 'a1000000-0000-0000-0000-000000000001' $$),
  0::bigint,
  'a viewer cannot change the dashboard'
);

reset role;
select throws_ok(
  $$insert into public.dashboards (family_id, layout) values ('a1000000-0000-0000-0000-000000000001', '{"version": 1, "cards": []}'::jsonb)$$,
  '23505',
  null,
  'a family cannot have a second dashboard'
);

select * from finish();
rollback;
