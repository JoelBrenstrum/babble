create function private.has_room_for_carer(target_family_id uuid, count_pending_invites boolean)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not (select billing_enabled from private.instance_settings)
    or (select plan from public.families where id = target_family_id) = 'plus'
    or (select count(*) from public.family_members where family_id = target_family_id)
      + case when count_pending_invites then
          (select count(*) from public.family_invites
           where family_id = target_family_id and used_at is null and expires_at > now())
        else 0 end < 2;
$$;

create or replace function public.create_invite(target_family_id uuid, invite_role public.family_role default 'caregiver')
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_code text;
  new_expires_at timestamptz;
begin
  if not private.can_edit_family(target_family_id) then
    raise exception 'Only owners and caregivers can invite' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext(target_family_id::text));
  if not private.has_room_for_carer(target_family_id, true) then
    raise exception 'A free family can have two carers' using errcode = 'PL002';
  end if;
  loop
    new_code := private.generate_invite_code();
    exit when not exists (select 1 from public.family_invites i where i.code = new_code);
  end loop;
  insert into public.family_invites as i (family_id, code, role, created_by)
  values (target_family_id, new_code, invite_role, auth.uid())
  returning i.expires_at into new_expires_at;
  code := new_code;
  expires_at := new_expires_at;
  return next;
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
