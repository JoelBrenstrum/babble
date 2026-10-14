create table public.former_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null,
  display_name text not null,
  removed_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

alter table public.former_members enable row level security;
revoke all on public.former_members from anon, authenticated;
grant select on public.former_members to authenticated;

create policy "members read former members" on public.former_members
  for select to authenticated using (family_id in (select private.my_family_ids()));

create or replace function private.after_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.family_members where family_id = old.family_id) then
    delete from public.families where id = old.family_id;
    return old;
  end if;
  -- The account is already gone when deleting it cascades here, and its name shouldn't outlive it.
  if exists (select 1 from auth.users where id = old.user_id) then
    insert into public.former_members (family_id, user_id, display_name)
    values (old.family_id, old.user_id, old.display_name)
    on conflict (family_id, user_id) do update
      set display_name = excluded.display_name, removed_at = excluded.removed_at;
  end if;
  if old.role = 'owner' and not exists (
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

create function private.after_member_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.former_members where family_id = new.family_id and user_id = new.user_id;
  return new;
end;
$$;
create trigger family_members_after_insert after insert on public.family_members
  for each row execute function private.after_member_added();

create function private.forget_deleted_former_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.former_members where user_id = old.id;
  return old;
end;
$$;
create trigger forget_former_member after delete on auth.users
  for each row execute function private.forget_deleted_former_member();

revoke all on function private.after_member_added() from public, anon, authenticated;
revoke all on function private.forget_deleted_former_member() from public, anon, authenticated;
