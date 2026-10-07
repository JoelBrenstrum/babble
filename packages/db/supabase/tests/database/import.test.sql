begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

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
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'importer@example.com', '{}', now(), now()),
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@example.com', '{}', now(), now());
insert into public.families (id, name) values ('00000000-0000-0000-0000-0000000000d2', 'Importers');
insert into public.family_members (family_id, user_id, role, display_name)
values ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d1', 'owner', 'Importer');
insert into public.babies (id, family_id, name, birth_date, timezone)
values ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d2', 'Baby', '2026-09-26', 'UTC');

create temp table batch on commit drop as select jsonb_build_array(
  jsonb_build_object('type', 'nappy', 'started_at', '2026-10-01T10:00:00Z', 'ended_at', '2026-10-01T10:00:00Z',
    'source', 'huckleberry_csv', 'source_ref', 'row-1', 'details', jsonb_build_object('wet', true)),
  jsonb_build_object('type', 'breast_feed', 'started_at', '2026-10-01T11:00:00Z', 'ended_at', '2026-10-01T11:20:00Z',
    'source', 'huckleberry_csv', 'source_ref', 'row-2',
    'segments', jsonb_build_array(jsonb_build_object('side', 'right', 'started_at', '2026-10-01T11:00:00Z', 'ended_at', '2026-10-01T11:20:00Z')))
) as events;
grant select on batch to authenticated;

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000d1');

select results_eq(
  $$ select imported, skipped from public.import_events('00000000-0000-0000-0000-0000000000d3', (select events from batch)) $$,
  $$ values (2, 0) $$, 'imports new events');
select is(
  (select count(*)::int from public.events where source = 'huckleberry_csv'),
  2, 'the events are stored with their source');
select is(
  (select count(*)::int from public.timed_segments s join public.events e on e.id = s.event_id where e.source_ref = 'row-2'),
  1, 'imported feeds keep their segments');
select results_eq(
  $$ select imported, skipped from public.import_events('00000000-0000-0000-0000-0000000000d3', (select events from batch)) $$,
  $$ values (0, 2) $$, 're-importing the same rows adds nothing');
select throws_ok(
  $$ select public.import_events('00000000-0000-0000-0000-0000000000d3',
       jsonb_build_array(jsonb_build_object('type', 'nappy', 'started_at', now(), 'ended_at', now()))) $$,
  '22023', 'Imported events need a source and source_ref', 'imports need a source reference');

select pg_temp.sign_in_as('00000000-0000-0000-0000-0000000000d5');
select throws_ok(
  $$ select public.import_events('00000000-0000-0000-0000-0000000000d3', (select events from batch) || jsonb_build_array(
       jsonb_build_object('type', 'nappy', 'started_at', now(), 'ended_at', now(), 'source', 'huckleberry_csv', 'source_ref', 'x'))) $$,
  '42501', null, 'strangers cannot import into another family');

select * from finish();
rollback;
