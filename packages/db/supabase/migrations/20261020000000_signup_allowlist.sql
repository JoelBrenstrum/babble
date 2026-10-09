create table private.signup_allowlist (
  email text primary key check (email = lower(email) and email like '%@%'),
  note text,
  added_at timestamptz not null default now(),
  used_at timestamptz
);

revoke all on private.signup_allowlist from public, anon, authenticated;

create or replace function private.enforce_signup_mode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mode public.signup_mode;
  reserved uuid;
begin
  select signup_mode into mode from private.instance_settings;
  if mode = 'open' then
    return new;
  end if;
  if not exists (select 1 from auth.users) then
    return new;
  end if;
  update public.family_invites
  set signed_up_at = now()
  where id = (private.valid_invite(new.raw_user_meta_data ->> 'invite_code')).id and signed_up_at is null
  returning id into reserved;
  if reserved is not null then
    return new;
  end if;
  update private.signup_allowlist
  set used_at = coalesce(used_at, now())
  where email = lower(new.email);
  if found then
    return new;
  end if;
  raise exception 'Sign-up on this Babble server requires a valid invite code'
    using errcode = 'P0001';
end;
$$;
