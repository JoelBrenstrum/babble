begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

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
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('a5000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'joel@device.test', '{}', now(), now()),
  ('a5000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'other@device.test', '{}', now(), now());
insert into public.device_links (code, secret_hash, device, expires_at) values
  ('CHAKR234', 'hash', 'Chromium on Linux', now() + interval '5 minutes'),
  ('XLDCXDE2', 'hash', 'Chrome on Mac', now() - interval '1 minute');

set local role anon;
select throws_ok($$ select * from public.device_links $$, '42501', null, 'signed-out visitors cannot read device links');
select throws_ok($$ select public.approve_device_link('CHAKR234') $$, '42501', null, 'signed-out visitors cannot approve');

select pg_temp.sign_in_as('a5000000-0000-0000-0000-00000000000a');
select throws_ok($$ select * from public.device_links $$, '42501', null, 'members cannot read device links directly');
select is(
  (select device from public.device_link_details('CHAKR234')),
  'Chromium on Linux',
  'a signed-in person sees which device is asking'
);
select is((select count(*)::int from public.device_link_details('XLDCXDE2')), 0, 'expired codes show nothing');
select throws_ok(
  $$ select public.approve_device_link('XLDCXDE2') $$,
  'PL005', 'This code has expired or was already used',
  'expired codes cannot be approved'
);
select lives_ok($$ select public.approve_device_link('CHAKR234') $$, 'a signed-in person approves a code');
select is((select count(*)::int from public.device_link_details('CHAKR234')), 0, 'an approved code shows nothing');

select pg_temp.sign_in_as('a5000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$ select public.approve_device_link('CHAKR234') $$,
  'PL005', 'This code has expired or was already used',
  'nobody else can take over an approved code'
);

reset role;
select is(
  (select approved_by from public.device_links where code = 'CHAKR234'),
  'a5000000-0000-0000-0000-00000000000a'::uuid,
  'the code signs in as whoever approved it'
);

select pg_temp.sign_in_as('a5000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ select * from public.start_device_link('PQRS2345', 'h', 'x', null) $$,
  '42501', null,
  'signed-in people cannot start device links directly'
);
select throws_ok(
  $$ select * from public.claim_device_link(gen_random_uuid(), 'h') $$,
  '42501', null,
  'signed-in people cannot claim device links'
);

set local role service_role;
create temp table started on commit drop as
  select * from public.start_device_link('PQRS2345', 'secret-hash', 'Chromium on Linux', '10.0.0.1');
select ok((select expires_at > now() from started), 'the server starts a device link');
select is(
  (select status from public.claim_device_link((select id from started), 'secret-hash')),
  'pending',
  'the device waits until someone approves'
);
select is(
  (select status from public.claim_device_link((select id from started), 'wrong-hash')),
  'expired',
  'the wrong secret cannot collect the sign-in'
);

select pg_temp.sign_in_as('a5000000-0000-0000-0000-00000000000b');
select public.approve_device_link('PQRS2345');
set local role service_role;
select results_eq(
  $$ select status, email from public.claim_device_link((select id from started), 'secret-hash') $$,
  $$ values ('approved'::text, 'other@device.test'::text) $$,
  'the device collects a sign-in for whoever approved it'
);
select is(
  (select status from public.claim_device_link((select id from started), 'secret-hash')),
  'expired',
  'a sign-in can only be collected once'
);

select lives_ok(
  $$ select public.start_device_link(code, 'h', '', '10.0.0.9')
     from unnest(array['AAAAAAA2', 'AAAAAAA3', 'AAAAAAA4', 'AAAAAAA5', 'AAAAAAA6',
                       'AAAAAAA7', 'AAAAAAA8', 'AAAAAAA9', 'AAAAAABA', 'AAAAAABC']) code $$,
  'a screen can make several codes'
);
select throws_ok(
  $$ select public.start_device_link('AAAAAABB', 'h', '', '10.0.0.9') $$,
  'PL006', 'Too many sign-in codes. Try again in a few minutes.',
  'too many codes from one address are refused'
);

select * from finish();
rollback;
