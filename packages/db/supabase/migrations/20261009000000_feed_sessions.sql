drop function public.end_session(uuid);
drop function public.start_session(uuid, public.event_type, public.side);

create function public.start_session(
  target_baby_id uuid,
  session_type public.event_type,
  start_side public.side default 'left',
  start_at timestamptz default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
  begins timestamptz := least(coalesce(start_at, now()), now());
begin
  if session_type not in ('breast_feed', 'pump', 'sleep') then
    raise exception 'Only feeds, pumps and sleeps have sessions' using errcode = '22023';
  end if;

  select id into new_id from public.events
  where baby_id = target_baby_id and type = session_type and ended_at is null and deleted_at is null;
  if new_id is not null then
    return new_id;
  end if;

  begin
    insert into public.events (baby_id, type, started_at) values (target_baby_id, session_type, begins)
    returning id into new_id;
  exception when unique_violation then
    select id into new_id from public.events
    where baby_id = target_baby_id and type = session_type and ended_at is null and deleted_at is null;
    return new_id;
  end;

  if session_type in ('breast_feed', 'pump') then
    insert into public.session_details (event_id, state) values (new_id, 'running');
    insert into public.timed_segments (event_id, side, started_at)
    values (new_id, coalesce(start_side, 'left'), begins);
  end if;
  return new_id;
end;
$$;

create function public.end_session(target_event_id uuid, end_at timestamptz default null)
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
  where event_id = current_session.id and ended_at is null;
  select max(ended_at) into last_end from public.timed_segments where event_id = current_session.id;
  update public.session_details set state = 'ended' where event_id = current_session.id;
  update public.events
  set ended_at = case
        when current_session.type = 'sleep' then ends
        else greatest(current_session.started_at, coalesce(last_end, ends))
      end,
      updated_at = now()
  where id = current_session.id;
end;
$$;

-- Only the most recent feed (breast or bottle) can be resumed, and only while no other feed is running.
create function public.resume_feed(target_event_id uuid, resume_side public.side default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  feed public.events;
  latest_feed_id uuid;
  last_side public.side;
begin
  select * into feed from public.events where id = target_event_id and deleted_at is null for update;
  if feed.id is null then
    raise exception 'Feed not found' using errcode = 'P0002';
  end if;
  if feed.type <> 'breast_feed' then
    raise exception 'Only breastfeeds can be resumed' using errcode = '22023';
  end if;
  if feed.ended_at is null then
    return;
  end if;
  if exists (
    select 1 from public.events
    where baby_id = feed.baby_id and type = 'breast_feed' and ended_at is null and deleted_at is null
  ) then
    raise exception 'Another feed is already running' using errcode = '22023';
  end if;

  select id into latest_feed_id from public.events
  where baby_id = feed.baby_id and type in ('breast_feed', 'bottle') and deleted_at is null
  order by started_at desc, created_at desc
  limit 1;
  if latest_feed_id <> feed.id then
    raise exception 'Only the most recent feed can be resumed' using errcode = '22023';
  end if;

  select side into last_side from public.timed_segments where event_id = feed.id order by started_at desc limit 1;
  update public.events set ended_at = null, updated_at = now() where id = feed.id;
  insert into public.session_details (event_id, state) values (feed.id, 'running')
  on conflict on constraint session_details_pkey do update set state = 'running';
  insert into public.timed_segments (event_id, side, started_at)
  values (feed.id, coalesce(resume_side, last_side, 'left'), now());
end;
$$;

revoke execute on function public.start_session, public.end_session, public.resume_feed from public, anon;
grant execute on function public.start_session, public.end_session, public.resume_feed to authenticated;
