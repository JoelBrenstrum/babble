alter table public.sleep_details
  add column quality smallint check (quality between 1 and 5);

grant update (quality) on public.sleep_details to authenticated;

create or replace function private.save_sleep_details(saved_id uuid, details jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.sleep_details as d (event_id, locations, fall_asleep, start_moods, end_moods, woken_by_carer, quality)
  values (
    saved_id,
    private.text_array(details -> 'locations')::public.sleep_location[],
    (details ->> 'fall_asleep')::public.fall_asleep,
    private.text_array(details -> 'start_moods')::public.mood[],
    private.text_array(details -> 'end_moods')::public.mood[],
    coalesce((details ->> 'woken_by_carer')::boolean, false),
    (details ->> 'quality')::smallint
  )
  on conflict on constraint sleep_details_pkey do update
  set locations = excluded.locations, fall_asleep = excluded.fall_asleep, start_moods = excluded.start_moods,
      end_moods = excluded.end_moods, woken_by_carer = excluded.woken_by_carer, quality = excluded.quality;
$$;

create or replace function public.save_sleep_details(target_event_id uuid, changes jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.events
  set notes = case when changes ? 'notes' then nullif(trim(changes ->> 'notes'), '') else notes end,
      updated_at = now()
  where id = target_event_id and type = 'sleep' and deleted_at is null;
  if not found then
    raise exception 'Sleep not found' using errcode = 'P0002';
  end if;

  insert into public.sleep_details (event_id) values (target_event_id) on conflict do nothing;
  update public.sleep_details
  set locations = case when changes ? 'locations'
        then private.text_array(changes -> 'locations')::public.sleep_location[] else locations end,
      fall_asleep = case when changes ? 'fall_asleep'
        then (changes ->> 'fall_asleep')::public.fall_asleep else fall_asleep end,
      start_moods = case when changes ? 'start_moods'
        then private.text_array(changes -> 'start_moods')::public.mood[] else start_moods end,
      end_moods = case when changes ? 'end_moods'
        then private.text_array(changes -> 'end_moods')::public.mood[] else end_moods end,
      woken_by_carer = case when changes ? 'woken_by_carer'
        then coalesce((changes ->> 'woken_by_carer')::boolean, false) else woken_by_carer end,
      quality = case when changes ? 'quality'
        then (changes ->> 'quality')::smallint else quality end
  where event_id = target_event_id;
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
     or later.started_at - earlier.ended_at > interval '20 minutes'
     or later.ended_at < earlier.ended_at then
    raise exception 'Sleeps can only be merged when the second starts during the first or within 20 minutes of it ending'
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

  insert into public.sleep_details as d (event_id, locations, fall_asleep, start_moods, end_moods, woken_by_carer, quality)
  values (
    earlier.id,
    coalesce(earlier_sleep.locations, '{}') || array(
      select location from unnest(later_sleep.locations) as location
      where location <> all(coalesce(earlier_sleep.locations, '{}'))
    ),
    coalesce(earlier_sleep.fall_asleep, later_sleep.fall_asleep),
    coalesce(nullif(earlier_sleep.start_moods, '{}'), later_sleep.start_moods, '{}'),
    coalesce(nullif(later_sleep.end_moods, '{}'), earlier_sleep.end_moods, '{}'),
    coalesce(later_sleep.woken_by_carer, false),
    coalesce(later_sleep.quality, earlier_sleep.quality)
  )
  on conflict on constraint sleep_details_pkey do update
  set locations = excluded.locations,
      fall_asleep = excluded.fall_asleep,
      start_moods = excluded.start_moods,
      end_moods = excluded.end_moods,
      woken_by_carer = excluded.woken_by_carer,
      quality = excluded.quality;

  insert into public.session_details (event_id, state)
  values (earlier.id, coalesce(later_state, case when later.ended_at is null then 'running' else 'ended' end::public.session_state))
  on conflict on constraint session_details_pkey do update set state = excluded.state;
end;
$$;
