-- Imports a batch of events, skipping any whose (source, source_ref) is already present, so re-importing a newer export only adds new rows.
create function public.import_events(target_baby_id uuid, events jsonb)
returns table (imported integer, skipped integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  added integer := 0;
  existing integer := 0;
begin
  if jsonb_typeof(events) <> 'array' then
    raise exception 'events must be an array' using errcode = '22023';
  end if;
  if jsonb_array_length(events) > 500 then
    raise exception 'Import at most 500 events at a time' using errcode = '22023';
  end if;

  for item in select * from jsonb_array_elements(events) loop
    if item ->> 'source' is null or item ->> 'source_ref' is null then
      raise exception 'Imported events need a source and source_ref' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.events e
      where e.baby_id = target_baby_id
        and e.source = (item ->> 'source')::public.event_source
        and e.source_ref = item ->> 'source_ref'
    ) then
      existing := existing + 1;
    else
      perform public.save_event((item - 'id') || jsonb_build_object('baby_id', target_baby_id));
      added := added + 1;
    end if;
  end loop;

  imported := added;
  skipped := existing;
  return next;
end;
$$;

revoke execute on function public.import_events from public, anon;
grant execute on function public.import_events to authenticated;
