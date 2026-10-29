begin;
create extension if not exists pgtap with schema extensions;

select plan(8);
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

select * from finish();
rollback;
