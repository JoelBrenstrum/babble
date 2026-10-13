begin;
create extension if not exists pgtap with schema extensions;

select plan(6);
update private.instance_settings set billing_enabled = false;

insert into public.families (id, name) values
  ('a1000000-0000-0000-0000-000000000001', 'Free family'),
  ('a1000000-0000-0000-0000-000000000002', 'Plus family');
update public.families set plan = 'plus' where id = 'a1000000-0000-0000-0000-000000000002';

create function pg_temp.add_baby(family uuid, baby_name text)
returns void
language sql
as $$
  insert into public.babies (family_id, name, birth_date, timezone)
  values (family, baby_name, current_date, 'Pacific/Auckland');
$$;

select lives_ok(
  $$select pg_temp.add_baby('a1000000-0000-0000-0000-000000000001', 'First')$$,
  'a free family can add its first baby'
);
select lives_ok(
  $$select pg_temp.add_baby('a1000000-0000-0000-0000-000000000001', 'Second')$$,
  'with billing off, a free family can add more babies'
);

update private.instance_settings set billing_enabled = true;

select throws_ok(
  $$select pg_temp.add_baby('a1000000-0000-0000-0000-000000000001', 'Third')$$,
  'PL001',
  'Adding more than one baby to a family needs Babble Plus',
  'with billing on, a free family cannot add another baby'
);
select lives_ok(
  $$select pg_temp.add_baby('a1000000-0000-0000-0000-000000000002', 'Plus one')$$,
  'with billing on, a plus family adds its first baby'
);
select lives_ok(
  $$select pg_temp.add_baby('a1000000-0000-0000-0000-000000000002', 'Plus two')$$,
  'with billing on, a plus family adds more babies'
);
select is(
  (select count(*)::int from public.babies where family_id = 'a1000000-0000-0000-0000-000000000001'),
  2,
  'existing babies are kept when billing is turned on'
);

select * from finish();
rollback;
