create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.family_role as enum ('owner', 'caregiver', 'viewer');
create type public.signup_mode as enum ('open', 'invite_only');
create type public.units as enum ('metric', 'imperial');

create table private.instance_settings (
  id boolean primary key default true check (id),
  signup_mode public.signup_mode not null default 'invite_only'
);
insert into private.instance_settings default values;

create function public.is_valid_timezone(tz text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  perform now() at time zone tz;
  return true;
exception when others then
  return false;
end;
$$;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  plan text not null default 'free' check (plan in ('free', 'plus')),
  created_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.family_role not null default 'caregiver',
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index family_members_user_id_idx on public.family_members (user_id);

create table public.babies (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  birth_date date not null,
  timezone text not null check (public.is_valid_timezone(timezone)),
  day_start_minutes integer not null default 0 check (day_start_minutes between 0 and 1439),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index babies_family_id_idx on public.babies (family_id);
create trigger babies_touch_updated_at before update on public.babies
  for each row execute function private.touch_updated_at();

create table public.baby_settings (
  baby_id uuid primary key references public.babies (id) on delete cascade,
  feed_reminder_interval_min integer check (feed_reminder_interval_min between 1 and 720),
  feed_reminder_enabled boolean not null default false,
  downtime_merge_threshold_sec integer not null default 15 check (downtime_merge_threshold_sec between 0 and 300),
  auto_end_paused_session_min integer not null default 30 check (auto_end_paused_session_min between 1 and 240),
  night_start_minutes integer not null default 1140 check (night_start_minutes between 0 and 1439),
  night_end_minutes integer not null default 420 check (night_end_minutes between 0 and 1439),
  units public.units not null default 'metric',
  updated_at timestamptz not null default now()
);
create trigger baby_settings_touch_updated_at before update on public.baby_settings
  for each row execute function private.touch_updated_at();

create table public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  code text not null unique,
  role public.family_role not null default 'caregiver' check (role <> 'owner'),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz
);
create index family_invites_family_id_idx on public.family_invites (family_id);

-- Membership helpers are security definer so RLS policies can call them without recursing into family_members' own policies.
create function private.has_family_role(target_family_id uuid, roles public.family_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.family_members
    where family_id = target_family_id and user_id = auth.uid() and role = any (roles)
  );
$$;

create function private.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_family_role(target_family_id, array['owner', 'caregiver', 'viewer']::public.family_role[]);
$$;

create function private.can_edit_family(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_family_role(target_family_id, array['owner', 'caregiver']::public.family_role[]);
$$;

create function private.baby_family_id(target_baby_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.babies where id = target_baby_id;
$$;

grant usage on schema private to authenticated;
grant execute on function private.has_family_role, private.is_family_member, private.can_edit_family,
  private.baby_family_id to authenticated;

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.babies enable row level security;
alter table public.baby_settings enable row level security;
alter table public.family_invites enable row level security;

create policy "members read their families" on public.families
  for select to authenticated using (private.is_family_member(id));
create policy "owners rename their families" on public.families
  for update to authenticated
  using (private.has_family_role(id, array['owner']::public.family_role[]))
  with check (private.has_family_role(id, array['owner']::public.family_role[]));

create policy "members read fellow members" on public.family_members
  for select to authenticated using (private.is_family_member(family_id));
create policy "members leave, owners remove" on public.family_members
  for delete to authenticated
  using (user_id = auth.uid() or private.has_family_role(family_id, array['owner']::public.family_role[]));

create policy "members read babies" on public.babies
  for select to authenticated using (private.is_family_member(family_id));
create policy "editors add babies" on public.babies
  for insert to authenticated with check (private.can_edit_family(family_id));
create policy "editors update babies" on public.babies
  for update to authenticated
  using (private.can_edit_family(family_id))
  with check (private.can_edit_family(family_id));
create policy "owners delete babies" on public.babies
  for delete to authenticated using (private.has_family_role(family_id, array['owner']::public.family_role[]));

create policy "members read baby settings" on public.baby_settings
  for select to authenticated using (private.is_family_member(private.baby_family_id(baby_id)));
create policy "editors update baby settings" on public.baby_settings
  for update to authenticated
  using (private.can_edit_family(private.baby_family_id(baby_id)))
  with check (private.can_edit_family(private.baby_family_id(baby_id)));

create policy "editors read invites" on public.family_invites
  for select to authenticated using (private.can_edit_family(family_id));
create policy "editors revoke invites" on public.family_invites
  for delete to authenticated using (private.can_edit_family(family_id));

revoke all on public.families, public.family_members, public.babies, public.baby_settings, public.family_invites
  from anon, authenticated;
grant select, update (name) on public.families to authenticated;
grant select, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.babies to authenticated;
grant select, update on public.baby_settings to authenticated;
grant select, delete on public.family_invites to authenticated;

create function private.create_baby_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.baby_settings (baby_id) values (new.id);
  return new;
end;
$$;
create trigger babies_create_settings after insert on public.babies
  for each row execute function private.create_baby_settings();

create function private.valid_invite(invite_code text)
returns public.family_invites
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.family_invites
  where code = upper(trim(invite_code)) and used_at is null and expires_at > now();
$$;

-- Runs before GoTrue inserts a user, so invite-only instances reject sign-ups that don't carry a valid invite code.
create function private.enforce_signup_mode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mode public.signup_mode;
begin
  select signup_mode into mode from private.instance_settings;
  if mode = 'open' then
    return new;
  end if;
  if not exists (select 1 from auth.users) then
    return new;
  end if;
  if (private.valid_invite(new.raw_user_meta_data ->> 'invite_code')).id is null then
    raise exception 'Sign-up on this Babble server requires a valid invite code'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger enforce_signup_mode before insert on auth.users
  for each row execute function private.enforce_signup_mode();

create function private.after_member_removed()
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
      where family_id = old.family_id
      order by (role = 'caregiver') desc, created_at
      limit 1
    );
  end if;
  return old;
end;
$$;
create trigger family_members_after_delete after delete on public.family_members
  for each row execute function private.after_member_removed();

create function public.get_instance_settings()
returns table (signup_mode public.signup_mode, has_users boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.signup_mode, exists (select 1 from auth.users) from private.instance_settings s;
$$;

create function public.check_invite(invite_code text)
returns table (family_name text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select f.name, i.expires_at
  from private.valid_invite(invite_code) i
  join public.families f on f.id = i.family_id;
$$;

create function public.create_family(family_name text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_family_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  insert into public.families (name) values (family_name) returning id into new_family_id;
  insert into public.family_members (family_id, user_id, role, display_name)
  values (new_family_id, auth.uid(), 'owner', display_name);
  return new_family_id;
end;
$$;

create function private.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea := extensions.gen_random_bytes(6);
  code text := '';
begin
  for i in 0..5 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
    if i = 2 then
      code := code || '-';
    end if;
  end loop;
  return code;
end;
$$;

create function public.create_invite(target_family_id uuid, invite_role public.family_role default 'caregiver')
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

create function public.accept_invite(invite_code text, display_name text)
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
  invite := private.valid_invite(invite_code);
  if invite.id is null then
    raise exception 'This invite code is invalid, used or expired' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.family_members where family_id = invite.family_id and user_id = auth.uid()) then
    return invite.family_id;
  end if;
  insert into public.family_members (family_id, user_id, role, display_name)
  values (invite.family_id, auth.uid(), invite.role, display_name);
  update public.family_invites set used_by = auth.uid(), used_at = now() where id = invite.id;
  return invite.family_id;
end;
$$;

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.create_family, public.create_invite, public.accept_invite, public.delete_my_account
  from public, anon;
grant execute on function public.create_family, public.create_invite, public.accept_invite, public.delete_my_account
  to authenticated;
grant execute on function public.get_instance_settings, public.check_invite to anon, authenticated;
