alter table public.timed_segments alter column side drop not null;

-- A nap only gets segments once it is first paused; until then it is one unbroken stretch of sleep.
create or replace function public.pause_session(target_event_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_session public.events := private.lock_running_session(target_event_id);
begin
  if current_session.ended_at is not null then
    raise exception 'This session has already finished' using errcode = '22023';
  end if;
  if current_session.type = 'sleep'
     and not exists (select 1 from public.timed_segments where event_id = current_session.id) then
    insert into public.timed_segments (event_id, side, started_at, ended_at)
    values (current_session.id, null, current_session.started_at, greatest(current_session.started_at, now()));
  end if;
  update public.timed_segments set ended_at = now() where event_id = current_session.id and ended_at is null;
  insert into public.session_details as d (event_id, state) values (current_session.id, 'paused')
  on conflict on constraint session_details_pkey do update set state = 'paused';
  update public.events set updated_at = now() where id = current_session.id;
end;
$$;

create or replace function public.resume_session(target_event_id uuid, resume_side public.side default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_session public.events := private.lock_running_session(target_event_id);
  last_side public.side;
begin
  if current_session.ended_at is not null then
    raise exception 'This session has already finished' using errcode = '22023';
  end if;
  if exists (select 1 from public.timed_segments where event_id = current_session.id and ended_at is null)
     or not exists (select 1 from public.timed_segments where event_id = current_session.id) then
    return;
  end if;
  select side into last_side from public.timed_segments where event_id = current_session.id order by started_at desc limit 1;
  insert into public.timed_segments (event_id, side, started_at)
  values (
    current_session.id,
    case when current_session.type = 'sleep' then null else coalesce(resume_side, last_side, 'left') end,
    now()
  );
  update public.session_details set state = 'running' where event_id = current_session.id;
  update public.events set updated_at = now() where id = current_session.id;
end;
$$;

create or replace function public.switch_side(target_event_id uuid, new_side public.side)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_session public.events := private.lock_running_session(target_event_id);
  open_side public.side;
begin
  if current_session.ended_at is not null then
    raise exception 'This session has already finished' using errcode = '22023';
  end if;
  if current_session.type = 'sleep' then
    raise exception 'Naps don''t have sides' using errcode = '22023';
  end if;
  select side into open_side from public.timed_segments where event_id = current_session.id and ended_at is null;
  if open_side = new_side then
    return;
  end if;
  update public.timed_segments set ended_at = now() where event_id = current_session.id and ended_at is null;
  insert into public.timed_segments (event_id, side, started_at) values (current_session.id, new_side, now());
  update public.session_details set state = 'running' where event_id = current_session.id;
  update public.events set updated_at = now() where id = current_session.id;
end;
$$;

-- A paused session ends when it was paused, so trailing awake time or downtime isn't counted.
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
  where event_id = current_session.id and ended_at is null;
  select max(ended_at) into last_end from public.timed_segments where event_id = current_session.id;
  update public.session_details set state = 'ended' where event_id = current_session.id;
  update public.events
  set ended_at = greatest(current_session.started_at, coalesce(last_end, ends)), updated_at = now()
  where id = current_session.id;
end;
$$;

create or replace function public.set_session_start(target_event_id uuid, start_at timestamptz)
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

  select * into first_segment from public.timed_segments
  where event_id = current_session.id order by started_at limit 1;
  if first_segment.id is not null and start_at >= coalesce(first_segment.ended_at, now()) then
    raise exception 'The start must be before the first side ended' using errcode = '22023';
  end if;
  if first_segment.id is not null then
    update public.timed_segments set started_at = start_at where id = first_segment.id;
  end if;

  update public.events set started_at = start_at, updated_at = now() where id = current_session.id;
end;
$$;

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
    when 'sleep' then
      insert into public.sleep_details as d (event_id, locations, fall_asleep, start_moods, end_moods, woken_by_carer)
      values (
        saved_id,
        private.text_array(details -> 'locations')::public.sleep_location[],
        (details ->> 'fall_asleep')::public.fall_asleep,
        private.text_array(details -> 'start_moods')::public.mood[],
        private.text_array(details -> 'end_moods')::public.mood[],
        coalesce((details ->> 'woken_by_carer')::boolean, false)
      )
      on conflict on constraint sleep_details_pkey do update
      set locations = excluded.locations, fall_asleep = excluded.fall_asleep, start_moods = excluded.start_moods,
          end_moods = excluded.end_moods, woken_by_carer = excluded.woken_by_carer;
    when 'bottle' then
      insert into public.bottle_details (event_id, content, amount_ml, amount_left_ml)
      values (
        saved_id,
        coalesce((details ->> 'content')::public.bottle_content, 'breast_milk'),
        (details ->> 'amount_ml')::integer,
        (details ->> 'amount_left_ml')::integer
      )
      on conflict on constraint bottle_details_pkey do update
      set content = excluded.content, amount_ml = excluded.amount_ml, amount_left_ml = excluded.amount_left_ml;
    when 'nappy' then
      insert into public.nappy_details (event_id, wet, dirty, wet_size, poo_size, poo_colours, poo_textures, rash)
      values (
        saved_id,
        coalesce((details ->> 'wet')::boolean, false),
        coalesce((details ->> 'dirty')::boolean, false),
        (details ->> 'wet_size')::public.size,
        (details ->> 'poo_size')::public.size,
        private.text_array(details -> 'poo_colours')::public.poo_colour[],
        private.text_array(details -> 'poo_textures')::public.poo_texture[],
        coalesce((details ->> 'rash')::boolean, false)
      )
      on conflict on constraint nappy_details_pkey do update
      set wet = excluded.wet, dirty = excluded.dirty, wet_size = excluded.wet_size, poo_size = excluded.poo_size,
          poo_colours = excluded.poo_colours, poo_textures = excluded.poo_textures, rash = excluded.rash;
    when 'pump' then
      insert into public.pump_details (event_id, left_ml, right_ml, total_ml)
      values (
        saved_id,
        (details ->> 'left_ml')::integer,
        (details ->> 'right_ml')::integer,
        (details ->> 'total_ml')::integer
      )
      on conflict on constraint pump_details_pkey do update
      set left_ml = excluded.left_ml, right_ml = excluded.right_ml, total_ml = excluded.total_ml;
    when 'growth' then
      insert into public.growth_details (event_id, weight_g, length_mm, head_circumference_mm)
      values (
        saved_id,
        (details ->> 'weight_g')::integer,
        (details ->> 'length_mm')::integer,
        (details ->> 'head_circumference_mm')::integer
      )
      on conflict on constraint growth_details_pkey do update
      set weight_g = excluded.weight_g, length_mm = excluded.length_mm,
          head_circumference_mm = excluded.head_circumference_mm;
    when 'custom' then
      insert into public.custom_details (event_id, title, description)
      values (saved_id, trim(details ->> 'title'), coalesce(trim(details ->> 'description'), ''))
      on conflict on constraint custom_details_pkey do update
      set title = excluded.title, description = excluded.description;
    else
      null;
  end case;

  if event_type in ('breast_feed', 'pump', 'sleep') and event ? 'segments' then
    delete from public.timed_segments s where s.event_id = saved_id;
    insert into public.timed_segments (event_id, side, started_at, ended_at)
    select saved_id, (segment ->> 'side')::public.side, (segment ->> 'started_at')::timestamptz,
           (segment ->> 'ended_at')::timestamptz
    from jsonb_array_elements(event -> 'segments') segment;
    insert into public.session_details as d (event_id, state)
    values (saved_id, case when event ->> 'ended_at' is null then 'paused' else 'ended' end::public.session_state)
    on conflict on constraint session_details_pkey do update
    set state = case
      when excluded.state = 'ended' then 'ended'::public.session_state
      when d.state = 'ended' then 'paused'::public.session_state
      else d.state
    end;
  end if;

  return saved_id;
end;
$$;
