create table public.family_settings (
  family_id uuid primary key references public.families (id) on delete cascade,
  units public.units not null default 'metric',
  downtime_merge_threshold_sec integer not null default 15 check (downtime_merge_threshold_sec between 0 and 300),
  auto_end_paused_session_min integer not null default 30 check (auto_end_paused_session_min between 1 and 240),
  updated_at timestamptz not null default now()
);
create trigger family_settings_touch_updated_at before update on public.family_settings
  for each row execute function private.touch_updated_at();

insert into public.family_settings (family_id, units, downtime_merge_threshold_sec, auto_end_paused_session_min)
select f.id, coalesce(s.units, 'metric'), coalesce(s.downtime_merge_threshold_sec, 15),
  coalesce(s.auto_end_paused_session_min, 30)
from public.families f
left join lateral (
  select bs.units, bs.downtime_merge_threshold_sec, bs.auto_end_paused_session_min
  from public.babies b
  join public.baby_settings bs on bs.baby_id = b.id
  where b.family_id = f.id
  order by b.created_at
  limit 1
) s on true;

alter table public.family_settings enable row level security;
create policy "members read family settings" on public.family_settings
  for select to authenticated using (private.is_family_member(family_id));
create policy "editors update family settings" on public.family_settings
  for update to authenticated
  using (private.can_edit_family(family_id))
  with check (private.can_edit_family(family_id));

revoke all on public.family_settings from anon, authenticated;
grant select on public.family_settings to authenticated;
grant update (units, downtime_merge_threshold_sec, auto_end_paused_session_min) on public.family_settings
  to authenticated;

create function private.create_family_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.family_settings (family_id) values (new.id);
  return new;
end;
$$;
create trigger families_create_settings after insert on public.families
  for each row execute function private.create_family_settings();

-- Older app versions still read and write these baby_settings columns, so both copies are kept in step.
create function private.copy_family_settings_to_babies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.baby_settings bs
  set units = new.units,
    downtime_merge_threshold_sec = new.downtime_merge_threshold_sec,
    auto_end_paused_session_min = new.auto_end_paused_session_min
  from public.babies b
  where b.id = bs.baby_id
    and b.family_id = new.family_id
    and (bs.units, bs.downtime_merge_threshold_sec, bs.auto_end_paused_session_min)
      is distinct from (new.units, new.downtime_merge_threshold_sec, new.auto_end_paused_session_min);
  return new;
end;
$$;
create trigger family_settings_copy_to_babies after update on public.family_settings
  for each row execute function private.copy_family_settings_to_babies();

create function private.copy_baby_settings_to_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.family_settings fs
  set units = new.units,
    downtime_merge_threshold_sec = new.downtime_merge_threshold_sec,
    auto_end_paused_session_min = new.auto_end_paused_session_min
  where fs.family_id = private.baby_family_id(new.baby_id)
    and (fs.units, fs.downtime_merge_threshold_sec, fs.auto_end_paused_session_min)
      is distinct from (new.units, new.downtime_merge_threshold_sec, new.auto_end_paused_session_min);
  return new;
end;
$$;
create trigger baby_settings_copy_to_family after update of units, downtime_merge_threshold_sec,
  auto_end_paused_session_min on public.baby_settings
  for each row execute function private.copy_baby_settings_to_family();

create or replace function private.create_baby_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.baby_settings (baby_id, units, downtime_merge_threshold_sec, auto_end_paused_session_min)
  select new.id, fs.units, fs.downtime_merge_threshold_sec, fs.auto_end_paused_session_min
  from public.family_settings fs
  where fs.family_id = new.family_id;
  if not found then
    insert into public.baby_settings (baby_id) values (new.id);
  end if;
  return new;
end;
$$;
