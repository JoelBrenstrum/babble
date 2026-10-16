alter table public.babies add column day_starts_at_night_end boolean not null default false;


update public.babies set day_starts_at_night_end = true where day_start_minutes <> 0;

update public.baby_settings settings
set night_end_minutes = babies.day_start_minutes
from public.babies
where babies.id = settings.baby_id
  and babies.day_starts_at_night_end
  and settings.night_end_minutes <> babies.day_start_minutes;

create function private.derive_day_start()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  night_end integer;
begin
  if tg_op = 'UPDATE' and new.day_starts_at_night_end is not distinct from old.day_starts_at_night_end then
    -- Writing day_start_minutes directly picks midnight (0) or a night end time.
    if new.day_start_minutes is distinct from old.day_start_minutes then
      new.day_starts_at_night_end := new.day_start_minutes <> 0;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.day_starts_at_night_end := new.day_starts_at_night_end or new.day_start_minutes <> 0;
  end if;

  if not new.day_starts_at_night_end then
    new.day_start_minutes := 0;
  elsif tg_op = 'UPDATE' then
    select settings.night_end_minutes into night_end from public.baby_settings settings where settings.baby_id = new.id;
    new.day_start_minutes := coalesce(night_end, 420);
  elsif new.day_start_minutes = 0 then
    new.day_start_minutes := 420;
  end if;
  return new;
end;
$$;

create trigger babies_derive_day_start before insert or update on public.babies
  for each row execute function private.derive_day_start();

create function private.sync_night_end_from_day_start()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.day_starts_at_night_end then
    update public.baby_settings
    set night_end_minutes = new.day_start_minutes
    where baby_id = new.id and night_end_minutes <> new.day_start_minutes;
  end if;
  return new;
end;
$$;

create trigger babies_sync_night_end after insert or update of day_start_minutes, day_starts_at_night_end
  on public.babies
  for each row execute function private.sync_night_end_from_day_start();

create function private.sync_day_start_from_night_end()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.babies
  set day_start_minutes = new.night_end_minutes
  where id = new.baby_id and day_starts_at_night_end and day_start_minutes <> new.night_end_minutes;
  return new;
end;
$$;

create trigger baby_settings_sync_day_start after update of night_end_minutes on public.baby_settings
  for each row execute function private.sync_day_start_from_night_end();

revoke all on function private.derive_day_start() from public, anon, authenticated;
revoke all on function private.sync_night_end_from_day_start() from public, anon, authenticated;
revoke all on function private.sync_day_start_from_night_end() from public, anon, authenticated;

grant insert (day_starts_at_night_end) on public.babies to authenticated;
grant update (day_starts_at_night_end) on public.babies to authenticated;
