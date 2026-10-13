create function private.my_owner_baby_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id from public.babies b
  join public.family_members m on m.family_id = b.family_id
  where m.user_id = (select auth.uid()) and m.role = 'owner';
$$;
revoke execute on function private.my_owner_baby_ids from public, anon;
grant execute on function private.my_owner_baby_ids to authenticated;

drop policy "editors add babies" on public.babies;
drop policy "editors update babies" on public.babies;
create policy "admins add babies" on public.babies
  for insert to authenticated with check (family_id in (select private.my_owner_family_ids()));
create policy "admins update babies" on public.babies
  for update to authenticated
  using (family_id in (select private.my_owner_family_ids()))
  with check (family_id in (select private.my_owner_family_ids()));

drop policy "editors update baby settings" on public.baby_settings;
create policy "admins update baby settings" on public.baby_settings
  for update to authenticated
  using (baby_id in (select private.my_owner_baby_ids()))
  with check (baby_id in (select private.my_owner_baby_ids()));

drop policy "editors update family settings" on public.family_settings;
create policy "admins update family settings" on public.family_settings
  for update to authenticated
  using (family_id in (select private.my_owner_family_ids()))
  with check (family_id in (select private.my_owner_family_ids()));

drop policy "editors read invites" on public.family_invites;
drop policy "editors revoke invites" on public.family_invites;
create policy "admins read invites" on public.family_invites
  for select to authenticated using (family_id in (select private.my_owner_family_ids()));
create policy "admins revoke invites" on public.family_invites
  for delete to authenticated using (family_id in (select private.my_owner_family_ids()));

alter table public.family_invites drop constraint family_invites_role_check;

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
  if not private.has_family_role(target_family_id, array['owner']::public.family_role[]) then
    raise exception 'Only admins can invite' using errcode = '42501';
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

create function public.set_member_role(target_family_id uuid, member_user_id uuid, new_role public.family_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_role public.family_role;
begin
  if not private.has_family_role(target_family_id, array['owner']::public.family_role[]) then
    raise exception 'Only admins can change roles' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext(target_family_id::text));
  select m.role into existing_role from public.family_members m
  where m.family_id = target_family_id and m.user_id = member_user_id
  for update;
  if existing_role is null then
    raise exception 'That person is not in this family';
  end if;
  if existing_role = 'owner' and new_role <> 'owner' and not exists (
    select 1 from public.family_members m
    where m.family_id = target_family_id and m.role = 'owner' and m.user_id <> member_user_id
  ) then
    raise exception 'A family needs at least one admin' using errcode = 'PL004';
  end if;
  update public.family_members set role = new_role
  where family_id = target_family_id and user_id = member_user_id;
end;
$$;
revoke execute on function public.set_member_role from public, anon;
grant execute on function public.set_member_role to authenticated;
