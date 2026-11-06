alter type public.event_type add value 'alert' after 'sleep';
create type public.alert_activity as enum ('tummy_time', 'play', 'reading', 'music', 'cuddles', 'outside', 'bath');
create type public.alert_end as enum ('fussy', 'hungry', 'tired', 'asleep');

create table public.alert_details (
  event_id uuid primary key references public.events (id) on delete cascade,
  activities public.alert_activity[] not null default '{}',
  ended_by public.alert_end
);

alter table public.alert_details enable row level security;
create policy "members read" on public.alert_details for select to authenticated
  using (exists (select 1 from public.events e where e.id = alert_details.event_id));
create policy "editors insert" on public.alert_details for insert to authenticated
  with check (exists (
    select 1 from public.events e
    where e.id = alert_details.event_id and e.baby_id in (select private.my_editor_baby_ids())));
create policy "editors update" on public.alert_details for update to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = alert_details.event_id and e.baby_id in (select private.my_editor_baby_ids())))
  with check (exists (
    select 1 from public.events e
    where e.id = alert_details.event_id and e.baby_id in (select private.my_editor_baby_ids())));
create policy "editors delete" on public.alert_details for delete to authenticated
  using (exists (
    select 1 from public.events e
    where e.id = alert_details.event_id and e.baby_id in (select private.my_editor_baby_ids())));
revoke all on public.alert_details from anon, authenticated;
grant select, insert, delete on public.alert_details to authenticated;
grant update (activities, ended_by) on public.alert_details to authenticated;

create trigger alert_details_event_type before insert or update of event_id on public.alert_details
  for each row execute function private.assert_event_type('alert');

create function private.save_alert_details(saved_id uuid, details jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.alert_details (event_id, activities, ended_by)
  values (
    saved_id,
    private.text_array(details -> 'activities')::public.alert_activity[],
    (details ->> 'ended_by')::public.alert_end
  )
  on conflict on constraint alert_details_pkey do update
  set activities = excluded.activities, ended_by = excluded.ended_by;
$$;
revoke all on function private.save_alert_details from public, anon, authenticated;
grant execute on function private.save_alert_details to authenticated;

create or replace function public.save_event(event jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid := coalesce((event ->> 'id')::uuid, gen_random_uuid());
  event_type public.event_type := (event ->> 'type')::public.event_type;
  details jsonb := coalesce(event -> 'details', '{}');
  existing_type public.event_type;
begin
  select e.type into existing_type from public.events e where e.id = saved_id;

  if existing_type is not null then
    if existing_type <> event_type then
      raise exception 'An event''s type cannot change' using errcode = '22023';
    end if;
    update public.events
    set started_at = (event ->> 'started_at')::timestamptz,
        ended_at = (event ->> 'ended_at')::timestamptz,
        notes = nullif(trim(event ->> 'notes'), ''),
        updated_at = now()
    where id = saved_id;
  else
    insert into public.events (id, baby_id, type, started_at, ended_at, notes, source, source_ref)
    values (
      saved_id,
      (event ->> 'baby_id')::uuid,
      event_type,
      (event ->> 'started_at')::timestamptz,
      (event ->> 'ended_at')::timestamptz,
      nullif(trim(event ->> 'notes'), ''),
      coalesce((event ->> 'source')::public.event_source, 'manual'),
      event ->> 'source_ref'
    );
  end if;

  case event_type
    when 'sleep' then perform private.save_sleep_details(saved_id, details);
    when 'alert' then perform private.save_alert_details(saved_id, details);
    when 'bottle' then perform private.save_bottle_details(saved_id, details);
    when 'nappy' then perform private.save_nappy_details(saved_id, details);
    when 'pump' then perform private.save_pump_details(saved_id, details);
    when 'growth' then perform private.save_growth_details(saved_id, details);
    when 'solids' then perform private.save_solids_details(saved_id, details);
    when 'custom' then perform private.save_custom_details(saved_id, details);
    else null;
  end case;

  if event_type in ('breast_feed', 'pump', 'sleep') and event ? 'segments' then
    perform private.save_segments(saved_id, event);
  end if;

  return saved_id;
end;
$$;

create or replace function private.lock_running_session(target_event_id uuid)
returns public.events
language plpgsql
set search_path = ''
as $$
declare
  locked public.events;
begin
  select * into locked from public.events where id = target_event_id and deleted_at is null for update;
  if locked.id is null then
    raise exception 'Session not found' using errcode = 'P0002';
  end if;
  if locked.type not in ('breast_feed', 'pump', 'sleep', 'alert') then
    raise exception 'Only feeds, pumps, sleeps and alert time have sessions' using errcode = '22023';
  end if;
  return locked;
end;
$$;

create or replace function public.start_session(
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
  running_alert public.events;
begin
  if session_type not in ('breast_feed', 'pump', 'sleep', 'alert') then
    raise exception 'Only feeds, pumps, sleeps and alert time have sessions' using errcode = '22023';
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
  elsif session_type = 'sleep' then
    select * into running_alert from public.events
    where baby_id = target_baby_id and type = 'alert' and ended_at is null and deleted_at is null
    for update;
    if running_alert.id is not null then
      insert into public.alert_details (event_id, ended_by) values (running_alert.id, 'asleep')
      on conflict on constraint alert_details_pkey do update
      set ended_by = coalesce(public.alert_details.ended_by, 'asleep');
      update public.events
      set ended_at = greatest(running_alert.started_at, begins), updated_at = now()
      where id = running_alert.id;
    end if;
  elsif session_type = 'alert' then
    insert into public.alert_details (event_id) values (new_id);
  end if;
  return new_id;
end;
$$;

create function public.end_alert(
  target_event_id uuid,
  reason public.alert_end default null,
  end_at timestamptz default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_alert public.events := private.lock_running_session(target_event_id);
  ends timestamptz := least(coalesce(end_at, now()), now());
begin
  if current_alert.type <> 'alert' then
    raise exception 'Only alert time can be ended here' using errcode = '22023';
  end if;
  if current_alert.ended_at is not null then
    return null;
  end if;
  if ends < current_alert.started_at then
    raise exception 'Alert time cannot end before it started' using errcode = '22023';
  end if;

  insert into public.alert_details (event_id, ended_by) values (current_alert.id, reason)
  on conflict on constraint alert_details_pkey do update set ended_by = excluded.ended_by;
  update public.events set ended_at = ends, updated_at = now() where id = current_alert.id;

  if reason = 'asleep' then
    return public.start_session(current_alert.baby_id, 'sleep', null, ends);
  end if;
  return null;
end;
$$;

create function public.save_alert_details(target_event_id uuid, changes jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.events
  set notes = case when changes ? 'notes' then nullif(trim(changes ->> 'notes'), '') else notes end,
      updated_at = now()
  where id = target_event_id and type = 'alert' and deleted_at is null;
  if not found then
    raise exception 'Alert time not found' using errcode = 'P0002';
  end if;

  insert into public.alert_details (event_id) values (target_event_id) on conflict do nothing;
  update public.alert_details
  set activities = case when changes ? 'activities'
        then private.text_array(changes -> 'activities')::public.alert_activity[] else activities end,
      ended_by = case when changes ? 'ended_by'
        then (changes ->> 'ended_by')::public.alert_end else ended_by end
  where event_id = target_event_id;
end;
$$;

revoke execute on function public.end_alert, public.save_alert_details from public, anon;
grant execute on function public.end_alert, public.save_alert_details to authenticated;
