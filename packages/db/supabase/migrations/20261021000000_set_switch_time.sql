create function public.set_switch_time(target_event_id uuid, switch_at timestamptz)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_session public.events := private.lock_running_session(target_event_id);
  latest public.timed_segments;
  previous public.timed_segments;
begin
  if current_session.ended_at is not null then
    raise exception 'Only a running session''s switch can be moved' using errcode = '22023';
  end if;
  if switch_at > now() then
    raise exception 'The switch can''t be in the future' using errcode = '22023';
  end if;

  select * into latest from public.timed_segments
  where event_id = current_session.id order by started_at desc limit 1;
  select * into previous from public.timed_segments
  where event_id = current_session.id and id <> latest.id order by started_at desc limit 1;
  if previous.id is null then
    raise exception 'There''s no switch to move yet' using errcode = '22023';
  end if;
  if switch_at >= latest.started_at then
    raise exception 'Pick a time before the switch' using errcode = '22023';
  end if;
  if switch_at <= previous.started_at then
    raise exception 'The switch must be after the previous side started' using errcode = '22023';
  end if;

  update public.timed_segments set ended_at = switch_at where id = previous.id and ended_at > switch_at;
  update public.timed_segments set started_at = switch_at where id = latest.id;
  update public.events set updated_at = now() where id = current_session.id;
end;
$$;

revoke execute on function public.set_switch_time from public, anon;
grant execute on function public.set_switch_time to authenticated;
