begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

create function pg_temp.create_user(user_id uuid, email text)
returns void
language sql
as $$
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
  values (user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', email, '{}', now(), now());
$$;

update private.instance_settings set signup_mode = 'open';
select pg_temp.create_user('11000000-0000-0000-0000-00000000000a', 'first@allowlist.test');
update private.instance_settings set signup_mode = 'invite_only';

insert into private.signup_allowlist (email, note) values ('jane@allowlist.test', 'Sister');

select throws_ok(
  $$select pg_temp.create_user('11000000-0000-0000-0000-00000000000b', 'stranger@allowlist.test')$$,
  'P0001',
  'Sign-up on this Babble server requires a valid invite code',
  'an email that is not allowed still needs an invite'
);
select lives_ok(
  $$select pg_temp.create_user('11000000-0000-0000-0000-00000000000c', 'Jane@Allowlist.TEST')$$,
  'an allowed email signs up without an invite, whatever its case'
);
select isnt(
  (select used_at from private.signup_allowlist where email = 'jane@allowlist.test'),
  null,
  'the allowlist records when it was used'
);
select throws_ok(
  $$insert into private.signup_allowlist (email) values ('Mixed@Case.test')$$,
  '23514',
  null,
  'allowlist emails are stored in lower case'
);

set local role authenticated;
select throws_ok($$select * from private.signup_allowlist$$, '42501', null, 'signed-in users cannot read the allowlist');
select throws_ok(
  $$insert into private.signup_allowlist (email) values ('me@allowlist.test')$$,
  '42501',
  null,
  'signed-in users cannot add themselves'
);
reset role;
set local role anon;
select throws_ok($$select * from private.signup_allowlist$$, '42501', null, 'visitors cannot read the allowlist');
reset role;

select * from finish();
rollback;
