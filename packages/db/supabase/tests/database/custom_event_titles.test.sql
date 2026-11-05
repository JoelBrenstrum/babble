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
  ('a3000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'owner@custom-titles.test', '{}', now(), now()),
  ('a3000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'viewer@custom-titles.test', '{}', now(), now()),
  ('a3000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'stranger@custom-titles.test', '{}', now(), now());
insert into public.families (id, name) values ('b3000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('b3000000-0000-0000-0000-00000000000a', 'a3000000-0000-0000-0000-00000000000a', 'owner', 'Owner'),
  ('b3000000-0000-0000-0000-00000000000a', 'a3000000-0000-0000-0000-00000000000b', 'viewer', 'Viewer');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('c3000000-0000-0000-0000-00000000000a', 'b3000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');

select is(
  (select array_agg(title order by created_at) from public.custom_event_titles
   where baby_id = 'c3000000-0000-0000-0000-00000000000a'),
  array['Bath', 'Tummy time', 'Vitamin drops', 'Skin to skin', 'Walk'],
  'new babies start with the default suggestions in order'
);

select pg_temp.sign_in_as('a3000000-0000-0000-0000-00000000000a');
insert into public.custom_event_titles (baby_id, title) values ('c3000000-0000-0000-0000-00000000000a', 'Calpol');
delete from public.custom_event_titles where baby_id = 'c3000000-0000-0000-0000-00000000000a' and title = 'Walk';
select is(
  (select count(*)::int from public.custom_event_titles where baby_id = 'c3000000-0000-0000-0000-00000000000a'),
  5,
  'editors can add and remove suggestions'
);
select throws_ok(
  $$insert into public.custom_event_titles (baby_id, title) values ('c3000000-0000-0000-0000-00000000000a', 'calpol')$$,
  '23505',
  null,
  'a title is saved once regardless of case'
);
select throws_ok(
  $$insert into public.custom_event_titles (baby_id, title) values ('c3000000-0000-0000-0000-00000000000a', ' Pamol')$$,
  '23514',
  null,
  'titles are stored trimmed'
);
select throws_ok(
  $$insert into public.custom_event_titles (baby_id, title, created_at)
    values ('c3000000-0000-0000-0000-00000000000a', 'Pamol', now() - interval '1 year')$$,
  '42501',
  null,
  'editors cannot choose where a suggestion sorts'
);
insert into public.babies (family_id, name, birth_date, timezone) values
  ('b3000000-0000-0000-0000-00000000000a', 'Noah', '2026-10-26', 'UTC');
select is(
  (select array_agg(t.title order by t.created_at) from public.custom_event_titles t
   join public.babies b on b.id = t.baby_id where b.name = 'Noah'),
  array['Bath', 'Tummy time', 'Vitamin drops', 'Skin to skin', 'Walk'],
  'a baby added by a carer starts with the default suggestions in order'
);
select pg_temp.sign_out();

select pg_temp.sign_in_as('a3000000-0000-0000-0000-00000000000b');
select is(
  (select count(*)::int from public.custom_event_titles where baby_id = 'c3000000-0000-0000-0000-00000000000a'),
  5,
  'viewers can read suggestions'
);
select throws_ok(
  $$insert into public.custom_event_titles (baby_id, title) values ('c3000000-0000-0000-0000-00000000000a', 'Pamol')$$,
  '42501',
  null,
  'viewers cannot add suggestions'
);
delete from public.custom_event_titles where baby_id = 'c3000000-0000-0000-0000-00000000000a';
select pg_temp.sign_out();
select is(
  (select count(*)::int from public.custom_event_titles where baby_id = 'c3000000-0000-0000-0000-00000000000a'),
  5,
  'viewers cannot remove suggestions'
);

select pg_temp.sign_in_as('a3000000-0000-0000-0000-00000000000c');
select is(
  (select count(*)::int from public.custom_event_titles where baby_id = 'c3000000-0000-0000-0000-00000000000a'),
  0,
  'other families cannot see suggestions'
);
select pg_temp.sign_out();

insert into public.custom_event_titles (baby_id, title)
select 'c3000000-0000-0000-0000-00000000000a', 'Title ' || n from generate_series(1, 35) n;
select pg_temp.sign_in_as('a3000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$insert into public.custom_event_titles (baby_id, title) values ('c3000000-0000-0000-0000-00000000000a', 'One more')$$,
  'PL009',
  null,
  'a baby keeps at most 40 suggestions'
);

select * from finish();
rollback;
