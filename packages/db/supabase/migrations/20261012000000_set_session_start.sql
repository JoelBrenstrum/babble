create function public.set_session_start(target_event_id uuid, start_at timestamptz)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_session public.events := private.lock_running_session(target_event_id);
  first_segment public.timed_segments;
begin
  if current_session.ended_at is not null then
    raise exception 'Only a running session''s start can be changed here' using errcode = '22023';
  end if;
  if start_at > now() then
    raise exception 'The start can''t be in the future' using errcode = '22023';
  end if;

  if current_session.type in ('breast_feed', 'pump') then
    select * into first_segment from public.timed_segments
    where event_id = current_session.id order by started_at limit 1;
    if first_segment.id is not null and start_at >= coalesce(first_segment.ended_at, now()) then
      raise exception 'The start must be before the first side ended' using errcode = '22023';
    end if;
    if first_segment.id is not null then
      update public.timed_segments set started_at = start_at where id = first_segment.id;
    end if;
  end if;

  update public.events set started_at = start_at, updated_at = now() where id = current_session.id;
end;
$$;

revoke execute on function public.set_session_start from public, anon;
grant execute on function public.set_session_start to authenticated;
