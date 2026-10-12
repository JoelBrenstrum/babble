begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

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
  ('a2000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'owner@nappy-prompt.test', '{}', now(), now());
insert into public.families (id, name) values ('b2000000-0000-0000-0000-00000000000a', 'Home');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('b2000000-0000-0000-0000-00000000000a', 'a2000000-0000-0000-0000-00000000000a', 'owner', 'Owner');
insert into public.babies (id, family_id, name, birth_date, timezone) values
  ('c2000000-0000-0000-0000-00000000000a', 'b2000000-0000-0000-0000-00000000000a', 'Olivia', '2026-09-26', 'UTC');

select is(
  (select nappy_prompt::text from public.baby_settings where baby_id = 'c2000000-0000-0000-0000-00000000000a'),
  'feed_start',
  'new babies ask about a nappy when a feed starts'
);

select pg_temp.sign_in_as('a2000000-0000-0000-0000-00000000000a');
update public.baby_settings set nappy_prompt = 'feed_end' where baby_id = 'c2000000-0000-0000-0000-00000000000a';
select pg_temp.sign_out();
select is(
  (select nappy_prompt::text from public.baby_settings where baby_id = 'c2000000-0000-0000-0000-00000000000a'),
  'feed_end',
  'editors can change when to ask'
);
select throws_ok(
  $$update public.baby_settings set nappy_prompt = 'sometimes' where baby_id = 'c2000000-0000-0000-0000-00000000000a'$$,
  '22P02',
  null,
  'only known timings are allowed'
);

select * from finish();
rollback;
