-- Devices ask from a cache that can be hours old, so staleness is decided here against the live session.
create function public.auto_end_stale_session(target_event_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_session public.events := private.lock_running_session(target_event_id);
  limit_minutes integer;
  segment_count integer;
  open_count integer;
  last_end timestamptz;
begin
  if current_session.ended_at is not null then
    return false;
  end if;

  select count(*), count(*) filter (where ended_at is null), max(ended_at)
  into segment_count, open_count, last_end
  from public.timed_segments
  where event_id = current_session.id;

  if open_count > 0 or (segment_count = 0 and current_session.type = 'sleep') then
    return false;
  end if;

  select fs.auto_end_paused_session_min into limit_minutes
  from public.babies b
  join public.family_settings fs on fs.family_id = b.family_id
  where b.id = current_session.baby_id;

  if now() - greatest(coalesce(last_end, current_session.started_at), current_session.started_at)
     < make_interval(mins => coalesce(limit_minutes, 30)) then
    return false;
  end if;

  perform public.end_session(target_event_id);
  return true;
end;
$$;
revoke execute on function public.auto_end_stale_session from public, anon;
grant execute on function public.auto_end_stale_session to authenticated;
