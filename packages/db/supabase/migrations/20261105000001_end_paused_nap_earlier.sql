create or replace function public.end_session(target_event_id uuid, end_at timestamptz default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_session public.events := private.lock_running_session(target_event_id);
  ends timestamptz := least(coalesce(end_at, now()), now());
  last_end timestamptz;
begin
  if current_session.ended_at is not null then
    return;
  end if;
  if ends < current_session.started_at then
    raise exception 'A session cannot end before it started' using errcode = '22023';
  end if;
  update public.timed_segments
  set ended_at = greatest(started_at, ends)
  where event_id = current_session.id
    and (ended_at is null or (current_session.type = 'sleep' and ended_at > ends));
  select max(ended_at) into last_end from public.timed_segments where event_id = current_session.id;
  update public.session_details set state = 'ended' where event_id = current_session.id;
  update public.events
  set ended_at = greatest(current_session.started_at, coalesce(last_end, ends)), updated_at = now()
  where id = current_session.id;
end;
$$;
