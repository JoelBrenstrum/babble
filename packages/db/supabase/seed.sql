-- Local development only: `supabase db reset` loads this; `supabase db push` never does.
-- Dev accounts sign in with the password "password" via the dev buttons on the sign-in screens.

update private.instance_settings set signup_mode = 'open';

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'john@babble.dev', extensions.crypt('password', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"John Smith"}', now(), now(), '', '', '', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'jane@babble.dev', extensions.crypt('password', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"full_name":"Jane Smith"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'email',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"john@babble.dev","email_verified":true}', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'email',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"jane@babble.dev","email_verified":true}', now(), now(), now());

update private.instance_settings set signup_mode = 'invite_only';

insert into public.families (id, name) values ('33333333-3333-3333-3333-333333333333', 'The Smiths');
insert into public.family_members (family_id, user_id, role, display_name) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'owner', 'John'),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'caregiver', 'Jane');
insert into public.babies (id, family_id, name, birth_date, timezone, day_start_minutes)
values ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Olivia',
        current_date - 11, 'Pacific/Auckland', 420);
insert into public.babies (id, family_id, name, birth_date, timezone, day_start_minutes)
values ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Jacob',
        current_date - 430, 'Pacific/Auckland', 420);
