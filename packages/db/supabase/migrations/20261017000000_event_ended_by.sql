alter table public.events
  add column ended_by uuid references auth.users (id) on delete set null,
  add column end_recorded_at timestamptz;

-- Set on every update so clients can't write these columns; ended_at itself can be backdated or edited later.
create function private.record_event_end()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.ended_at is null then
    new.ended_by := null;
    new.end_recorded_at := null;
  elsif old.ended_at is null then
    new.ended_by := auth.uid();
    new.end_recorded_at := now();
  else
    new.ended_by := old.ended_by;
    new.end_recorded_at := old.end_recorded_at;
  end if;
  return new;
end;
$$;
create trigger events_record_end before update on public.events
  for each row execute function private.record_event_end();
