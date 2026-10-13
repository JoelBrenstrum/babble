create function private.assert_event_type()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_type public.event_type;
begin
  select e.type into parent_type from public.events e where e.id = new.event_id;
  if parent_type is not null and parent_type <> all (tg_argv::public.event_type[]) then
    raise exception '% rows cannot belong to a % event', tg_table_name, parent_type using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger sleep_details_event_type before insert or update of event_id on public.sleep_details
  for each row execute function private.assert_event_type('sleep');
create trigger session_details_event_type before insert or update of event_id on public.session_details
  for each row execute function private.assert_event_type('breast_feed', 'pump', 'sleep');
create trigger bottle_details_event_type before insert or update of event_id on public.bottle_details
  for each row execute function private.assert_event_type('bottle');
create trigger solids_details_event_type before insert or update of event_id on public.solids_details
  for each row execute function private.assert_event_type('solids');
create trigger nappy_details_event_type before insert or update of event_id on public.nappy_details
  for each row execute function private.assert_event_type('nappy');
create trigger pump_details_event_type before insert or update of event_id on public.pump_details
  for each row execute function private.assert_event_type('pump');
create trigger growth_details_event_type before insert or update of event_id on public.growth_details
  for each row execute function private.assert_event_type('growth');
create trigger custom_details_event_type before insert or update of event_id on public.custom_details
  for each row execute function private.assert_event_type('custom');

create function private.assert_segment_valid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_type public.event_type;
begin
  select e.type into parent_type from public.events e where e.id = new.event_id;
  if parent_type is null then
    return new;
  end if;
  if parent_type not in ('breast_feed', 'pump', 'sleep') then
    raise exception 'timed_segments rows cannot belong to a % event', parent_type using errcode = '23514';
  end if;
  if new.side is null and parent_type <> 'sleep' then
    raise exception 'A % segment needs a side', parent_type using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger timed_segments_valid before insert or update of event_id, side on public.timed_segments
  for each row execute function private.assert_segment_valid();

create function private.sync_session_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.session_details
  set state = case when new.ended_at is not null then 'ended'::public.session_state else 'paused'::public.session_state end
  where event_id = new.id and (state = 'ended') <> (new.ended_at is not null);
  return new;
end;
$$;
create trigger events_sync_session_state after update of ended_at on public.events
  for each row when (old.ended_at is distinct from new.ended_at)
  execute function private.sync_session_state();

create function private.check_session_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_state public.session_state;
  parent_ended_at timestamptz;
begin
  -- Deferred trigger rows carry the tuple from when they were queued, so the live row is read instead.
  select d.state, e.ended_at into current_state, parent_ended_at
  from public.session_details d join public.events e on e.id = d.event_id
  where d.event_id = new.event_id;
  if not found then
    return null;
  end if;
  if (current_state = 'ended') <> (parent_ended_at is not null) then
    raise exception 'A session is ended exactly when its event has an end time' using errcode = '23514';
  end if;
  return null;
end;
$$;
create constraint trigger session_details_state_matches_event after insert or update of state on public.session_details
  deferrable initially deferred
  for each row execute function private.check_session_state();
