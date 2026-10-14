alter table public.events add column created_device text check (char_length(created_device) <= 60);

create function private.set_event_device()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_device is null then
    new.created_device := nullif(
      left(trim(coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-babble-device'), 60),
      ''
    );
  end if;
  return new;
end;
$$;
revoke all on function private.set_event_device() from public, anon, authenticated;

create trigger events_set_device before insert on public.events
  for each row execute function private.set_event_device();
