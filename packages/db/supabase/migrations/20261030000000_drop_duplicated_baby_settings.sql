drop trigger baby_settings_copy_to_family on public.baby_settings;
drop trigger family_settings_copy_to_babies on public.family_settings;
drop function private.copy_baby_settings_to_family();
drop function private.copy_family_settings_to_babies();

create or replace function private.create_baby_settings()
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

alter table public.baby_settings
  drop column units,
  drop column downtime_merge_threshold_sec,
  drop column auto_end_paused_session_min;
