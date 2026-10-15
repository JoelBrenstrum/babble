create table public.session_devices (
  session_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  updated_at timestamptz not null default now()
);

create index session_devices_user_id_idx on public.session_devices (user_id);

alter table public.session_devices enable row level security;
revoke all on public.session_devices from anon, authenticated;

create function private.current_session_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'session_id', '')::uuid;
$$;
revoke all on function private.current_session_id() from public, anon, authenticated;

create function public.family_devices(target_family_id uuid)
returns table (
  session_id uuid,
  user_id uuid,
  member_name text,
  name text,
  user_agent text,
  created_at timestamptz,
  last_active timestamptz,
  is_current boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  admin boolean;
begin
  if me is null or not exists (
    select 1 from public.family_members m where m.family_id = target_family_id and m.user_id = me
  ) then
    raise exception 'You are not in this family' using errcode = '42501';
  end if;
  admin := exists (
    select 1 from public.family_members m
    where m.family_id = target_family_id and m.user_id = me and m.role = 'owner'
  );
  return query
    select
      s.id,
      s.user_id,
      m.display_name,
      d.name,
      s.user_agent,
      s.created_at,
      coalesce(s.refreshed_at at time zone 'UTC', s.updated_at, s.created_at),
      s.id = private.current_session_id()
    from auth.sessions s
    join public.family_members m on m.family_id = target_family_id and m.user_id = s.user_id
    left join public.session_devices d on d.session_id = s.id
    where (admin or s.user_id = me)
      and (s.not_after is null or s.not_after > now())
      and (
        s.id = private.current_session_id()
        or coalesce(s.refreshed_at at time zone 'UTC', s.updated_at, s.created_at) > now() - interval '30 days'
      )
    order by
      s.id = private.current_session_id() desc,
      d.name is not null desc,
      coalesce(s.refreshed_at at time zone 'UTC', s.updated_at, s.created_at) desc;
end;
$$;
revoke all on function public.family_devices(uuid) from public, anon;
grant execute on function public.family_devices(uuid) to authenticated;

create function public.rename_device(target_session_id uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  owner_id uuid;
  trimmed text := nullif(trim(coalesce(new_name, '')), '');
begin
  select s.user_id into owner_id from auth.sessions s where s.id = target_session_id;
  if me is null or owner_id is null or (
    owner_id <> me and not exists (
      select 1 from public.family_members mine
      join public.family_members theirs on theirs.family_id = mine.family_id
      where mine.user_id = me and mine.role = 'owner' and theirs.user_id = owner_id
    )
  ) then
    raise exception 'You can''t rename that device' using errcode = '42501';
  end if;
  if trimmed is null then
    delete from public.session_devices where session_id = target_session_id;
    return;
  end if;
  if char_length(trimmed) > 60 then
    raise exception 'Use 60 characters or fewer for the name' using errcode = '22001';
  end if;
  insert into public.session_devices (session_id, user_id, name, updated_at)
  values (target_session_id, owner_id, trimmed, now())
  on conflict (session_id) do update set name = excluded.name, updated_at = excluded.updated_at;
end;
$$;
revoke all on function public.rename_device(uuid, text) from public, anon;
grant execute on function public.rename_device(uuid, text) to authenticated;

create function private.may_manage_session(target_session_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id from auth.sessions s
  where s.id = target_session_id
    and (
      s.user_id = (select auth.uid())
      or exists (
        select 1 from public.family_members mine
        join public.family_members theirs on theirs.family_id = mine.family_id
        where mine.user_id = (select auth.uid()) and mine.role = 'owner' and theirs.user_id = s.user_id
      )
    );
$$;
revoke all on function private.may_manage_session(uuid) from public, anon, authenticated;

create function public.sign_out_device(target_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or private.may_manage_session(target_session_id) is null then
    raise exception 'You can''t sign out that device' using errcode = '42501';
  end if;
  delete from public.session_devices where session_id = target_session_id;
  delete from auth.sessions where id = target_session_id;
end;
$$;
revoke all on function public.sign_out_device(uuid) from public, anon;
grant execute on function public.sign_out_device(uuid) to authenticated;

create or replace function private.set_event_device()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_device is null then
    new.created_device := coalesce(
      (select d.name from public.session_devices d where d.session_id = private.current_session_id()),
      nullif(
        left(trim(coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-babble-device'), 60),
        ''
      )
    );
  end if;
  return new;
end;
$$;
