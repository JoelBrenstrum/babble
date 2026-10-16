create or replace function public.merge_feeds(earlier_id uuid, later_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  earlier public.events;
  later public.events;
  later_state public.session_state;
begin
  select * into earlier from public.events where id = earlier_id for update;
  select * into later from public.events where id = later_id for update;
  if earlier.id is null or later.id is null or earlier.deleted_at is not null or later.deleted_at is not null then
    raise exception 'Those feeds can''t be found' using errcode = 'PL007';
  end if;
  if later.baby_id not in (select private.my_editor_baby_ids()) then
    raise exception 'Only people who can log can merge feeds' using errcode = '42501';
  end if;
  if earlier.baby_id <> later.baby_id or earlier.type <> 'breast_feed' or later.type <> 'breast_feed' then
    raise exception 'Only breastfeeds for the same baby can be merged' using errcode = 'PL007';
  end if;
  if earlier.ended_at is null or later.started_at <= earlier.started_at
     or later.started_at - earlier.ended_at > interval '30 minutes'
     or later.ended_at < earlier.ended_at then
    raise exception 'Feeds can only be merged when the second starts during the first or within 30 minutes of it ending'
      using errcode = 'PL007';
  end if;

  select state into later_state from public.session_details where event_id = later.id;

  -- Where the two overlap, the later entry's record wins.
  delete from public.timed_segments where event_id = earlier.id and started_at >= later.started_at;
  update public.timed_segments set ended_at = later.started_at
  where event_id = earlier.id and ended_at > later.started_at;

  update public.events set deleted_at = now() where id = later.id;
  update public.timed_segments set event_id = earlier.id where event_id = later.id;

  perform set_config('babble.keep_event_end', 'on', true);
  update public.events
  set ended_at = later.ended_at,
      ended_by = later.ended_by,
      end_recorded_at = later.end_recorded_at,
      notes = nullif(concat_ws(e'\n', nullif(trim(earlier.notes), ''), nullif(trim(later.notes), '')), ''),
      updated_at = now()
  where id = earlier.id;
  perform set_config('babble.keep_event_end', 'off', true);

  insert into public.session_details (event_id, state)
  values (earlier.id, coalesce(later_state, case when later.ended_at is null then 'running' else 'ended' end::public.session_state))
  on conflict on constraint session_details_pkey do update set state = excluded.state;
end;
$$;

create or replace function public.merge_sleeps(earlier_id uuid, later_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  earlier public.events;
  later public.events;
  earlier_sleep public.sleep_details;
  later_sleep public.sleep_details;
  later_state public.session_state;
begin
  select * into earlier from public.events where id = earlier_id for update;
  select * into later from public.events where id = later_id for update;
  if earlier.id is null or later.id is null or earlier.deleted_at is not null or later.deleted_at is not null then
    raise exception 'Those sleeps can''t be found' using errcode = 'PL007';
  end if;
  if later.baby_id not in (select private.my_editor_baby_ids()) then
    raise exception 'Only people who can log can merge sleeps' using errcode = '42501';
  end if;
  if earlier.baby_id <> later.baby_id or earlier.type <> 'sleep' or later.type <> 'sleep' then
    raise exception 'Only sleeps for the same baby can be merged' using errcode = 'PL007';
  end if;
  if earlier.ended_at is null or later.started_at <= earlier.started_at
     or later.started_at - earlier.ended_at > interval '30 minutes'
     or later.ended_at < earlier.ended_at then
    raise exception 'Sleeps can only be merged when the second starts during the first or within 30 minutes of it ending'
      using errcode = 'PL007';
  end if;

  select * into earlier_sleep from public.sleep_details where event_id = earlier.id;
  select * into later_sleep from public.sleep_details where event_id = later.id;
  select state into later_state from public.session_details where event_id = later.id;

  -- A sleep without segments was asleep throughout; the merged sleep needs explicit stretches so the gap reads as awake.
  if not exists (select 1 from public.timed_segments where event_id = earlier.id) then
    insert into public.timed_segments (event_id, side, started_at, ended_at)
    values (earlier.id, null, earlier.started_at, earlier.ended_at);
  end if;
  if not exists (select 1 from public.timed_segments where event_id = later.id) then
    insert into public.timed_segments (event_id, side, started_at, ended_at)
    values (later.id, null, later.started_at, later.ended_at);
  end if;

  -- Where the two overlap, the later entry's record wins.
  delete from public.timed_segments where event_id = earlier.id and started_at >= later.started_at;
  update public.timed_segments set ended_at = later.started_at
  where event_id = earlier.id and ended_at > later.started_at;

  update public.events set deleted_at = now() where id = later.id;
  update public.timed_segments set event_id = earlier.id where event_id = later.id;

  perform set_config('babble.keep_event_end', 'on', true);
  update public.events
  set ended_at = later.ended_at,
      ended_by = later.ended_by,
      end_recorded_at = later.end_recorded_at,
      notes = nullif(concat_ws(e'\n', nullif(trim(earlier.notes), ''), nullif(trim(later.notes), '')), ''),
      updated_at = now()
  where id = earlier.id;
  perform set_config('babble.keep_event_end', 'off', true);

  insert into public.sleep_details as d (event_id, locations, fall_asleep, start_moods, end_moods, woken_by_carer)
  values (
    earlier.id,
    coalesce(earlier_sleep.locations, '{}') || array(
      select location from unnest(later_sleep.locations) as location
      where location <> all(coalesce(earlier_sleep.locations, '{}'))
    ),
    coalesce(earlier_sleep.fall_asleep, later_sleep.fall_asleep),
    coalesce(nullif(earlier_sleep.start_moods, '{}'), later_sleep.start_moods, '{}'),
    coalesce(nullif(later_sleep.end_moods, '{}'), earlier_sleep.end_moods, '{}'),
    coalesce(later_sleep.woken_by_carer, false)
  )
  on conflict on constraint sleep_details_pkey do update
  set locations = excluded.locations,
      fall_asleep = excluded.fall_asleep,
      start_moods = excluded.start_moods,
      end_moods = excluded.end_moods,
      woken_by_carer = excluded.woken_by_carer;

  insert into public.session_details (event_id, state)
  values (earlier.id, coalesce(later_state, case when later.ended_at is null then 'running' else 'ended' end::public.session_state))
  on conflict on constraint session_details_pkey do update set state = excluded.state;
end;
$$;
