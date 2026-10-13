alter table public.family_invites
  add column signed_up_user_id uuid references auth.users (id) on delete set null deferrable initially deferred;
create index family_invites_signed_up_user_idx on public.family_invites (signed_up_user_id)
  where signed_up_user_id is not null;

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
  perform pg_advisory_xact_lock(hashtext('babble.signup'));
  if not exists (select 1 from auth.users) then
    return new;
  end if;
  update public.family_invites
  set signed_up_at = now(), signed_up_user_id = new.id
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
    using errcode = 'PL003';
end;
$$;

create or replace function public.accept_invite(invite_code text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.family_invites;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  select * into invite from public.family_invites
  where code = upper(trim(invite_code)) and used_at is null and expires_at > now()
    and (signed_up_user_id is null or signed_up_user_id = auth.uid())
  for update;
  if invite.id is null then
    raise exception 'This invite code is invalid, used or expired' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.family_members where family_id = invite.family_id and user_id = auth.uid()) then
    return invite.family_id;
  end if;
  perform pg_advisory_xact_lock(hashtext(invite.family_id::text));
  if not private.has_room_for_carer(invite.family_id, false) then
    raise exception 'A free family can have two carers' using errcode = 'PL002';
  end if;
  insert into public.family_members (family_id, user_id, role, display_name)
  values (invite.family_id, auth.uid(), invite.role, display_name);
  update public.family_invites set used_by = auth.uid(), used_at = now() where id = invite.id;
  return invite.family_id;
end;
$$;

create or replace function private.after_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.family_members where family_id = old.family_id) then
    delete from public.families where id = old.family_id;
  elsif old.role = 'owner' and not exists (
    select 1 from public.family_members where family_id = old.family_id and role = 'owner'
  ) then
    update public.family_members set role = 'owner'
    where (family_id, user_id) = (
      select family_id, user_id from public.family_members
      where family_id = old.family_id and role = 'caregiver'
      order by created_at
      limit 1
    );
  end if;
  return old;
end;
$$;
