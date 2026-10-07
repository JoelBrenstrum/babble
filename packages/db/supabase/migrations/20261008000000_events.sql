create type public.event_type as enum ('sleep', 'breast_feed', 'bottle', 'nappy', 'pump', 'growth', 'custom');
create type public.event_source as enum ('manual', 'huckleberry_csv');
create type public.side as enum ('left', 'right');
create type public.session_state as enum ('running', 'paused', 'ended');
create type public.size as enum ('tiny', 'little', 'medium', 'large', 'massive');
create type public.poo_colour as enum (
  'yellow', 'mustard', 'green', 'dark_green', 'brown', 'orange', 'black', 'red', 'white_grey'
);
create type public.poo_texture as enum (
  'runny', 'loose', 'seedy', 'pasty', 'formed', 'mucousy', 'hard', 'pebbles', 'diarrhea'
);
create type public.bottle_content as enum ('breast_milk', 'formula', 'mixed', 'other');
create type public.sleep_location as enum (
  'cot', 'bassinet', 'pram', 'car', 'swing', 'held', 'nursing', 'bottle', 'co_sleep', 'next_to_carer', 'other'
);
create type public.fall_asleep as enum ('under_10_min', '10_to_20_min', 'long_time');
create type public.mood as enum ('happy', 'upset');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies (id) on delete cascade,
  type public.event_type not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  notes text check (char_length(notes) <= 2000),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  source public.event_source not null default 'manual',
  source_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);
create index events_baby_started_idx on public.events (baby_id, started_at desc) where deleted_at is null;
create index events_baby_type_started_idx on public.events (baby_id, type, started_at desc) where deleted_at is null;
create unique index events_one_running_per_type on public.events (baby_id, type)
  where ended_at is null and deleted_at is null;
create unique index events_source_ref_unique on public.events (baby_id, source, source_ref)
  where source_ref is not null;
create trigger events_touch_updated_at before update on public.events
  for each row execute function private.touch_updated_at();

create function private.set_event_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;
create trigger events_set_author before insert on public.events
  for each row execute function private.set_event_author();

create table public.sleep_details (
  event_id uuid primary key references public.events (id) on delete cascade,
  locations public.sleep_location[] not null default '{}',
  fall_asleep public.fall_asleep,
  start_moods public.mood[] not null default '{}',
  end_moods public.mood[] not null default '{}',
  woken_by_carer boolean not null default false
);

create table public.session_details (
  event_id uuid primary key references public.events (id) on delete cascade,
  state public.session_state not null default 'running'
);

create table public.timed_segments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  side public.side not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  check (ended_at is null or ended_at >= started_at)
);
create index timed_segments_event_idx on public.timed_segments (event_id, started_at);
create unique index timed_segments_one_open on public.timed_segments (event_id) where ended_at is null;

create table public.bottle_details (
  event_id uuid primary key references public.events (id) on delete cascade,
  content public.bottle_content not null default 'breast_milk',
  amount_ml integer check (amount_ml between 0 and 2000),
  amount_left_ml integer check (amount_left_ml between 0 and 2000)
);

create table public.nappy_details (
  event_id uuid primary key references public.events (id) on delete cascade,
  wet boolean not null default false,
  dirty boolean not null default false,
  wet_size public.size,
  poo_size public.size,
  poo_colours public.poo_colour[] not null default '{}' check (cardinality(poo_colours) <= 2),
  poo_textures public.poo_texture[] not null default '{}',
  rash boolean not null default false
);

create table public.pump_details (
  event_id uuid primary key references public.events (id) on delete cascade,
  left_ml integer check (left_ml between 0 and 2000),
  right_ml integer check (right_ml between 0 and 2000),
  total_ml integer check (total_ml between 0 and 4000)
);

create table public.growth_details (
  event_id uuid primary key references public.events (id) on delete cascade,
  weight_g integer check (weight_g between 200 and 50000),
  length_mm integer check (length_mm between 200 and 2000),
  head_circumference_mm integer check (head_circumference_mm between 150 and 700),
  check (coalesce(weight_g, length_mm, head_circumference_mm) is not null)
);

create table public.custom_details (
  event_id uuid primary key references public.events (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000)
);

create function private.event_family_id(target_event_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.family_id from public.events e join public.babies b on b.id = e.baby_id where e.id = target_event_id;
$$;
grant execute on function private.event_family_id to authenticated;

alter table public.events enable row level security;
create policy "members read events" on public.events
  for select to authenticated using (private.is_family_member(private.baby_family_id(baby_id)));
create policy "editors add events" on public.events
  for insert to authenticated with check (private.can_edit_family(private.baby_family_id(baby_id)));
create policy "editors update events" on public.events
  for update to authenticated
  using (private.can_edit_family(private.baby_family_id(baby_id)))
  with check (private.can_edit_family(private.baby_family_id(baby_id)));

revoke all on public.events from anon, authenticated;
grant select, insert on public.events to authenticated;
grant update (started_at, ended_at, notes, deleted_at, updated_at) on public.events to authenticated;

do $$
declare
  child text;
begin
  foreach child in array array[
    'sleep_details', 'session_details', 'timed_segments', 'bottle_details',
    'nappy_details', 'pump_details', 'growth_details', 'custom_details'
  ] loop
    execute format('alter table public.%I enable row level security', child);
    execute format(
      'create policy "members read" on public.%I for select to authenticated
         using (private.is_family_member(private.event_family_id(event_id)))', child);
    execute format(
      'create policy "editors write" on public.%I for all to authenticated
         using (private.can_edit_family(private.event_family_id(event_id)))
         with check (private.can_edit_family(private.event_family_id(event_id)))', child);
    execute format('revoke all on public.%I from anon, authenticated', child);
    execute format('grant select, insert, update, delete on public.%I to authenticated', child);
  end loop;
end;
$$;

create function private.text_array(value jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array(select jsonb_array_elements_text(value)), '{}');
$$;
grant execute on function private.text_array to authenticated;

create function public.save_event(event jsonb)
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

  if event_type in ('breast_feed', 'pump') and event ? 'segments' then
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

create function private.lock_running_session(target_event_id uuid)
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
  if locked.type not in ('breast_feed', 'pump', 'sleep') then
    raise exception 'Only feeds, pumps and sleeps have sessions' using errcode = '22023';
  end if;
  return locked;
end;
$$;
grant execute on function private.lock_running_session to authenticated;

create function public.start_session(target_baby_id uuid, session_type public.event_type, start_side public.side default 'left')
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
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
    insert into public.events (baby_id, type, started_at) values (target_baby_id, session_type, now())
    returning id into new_id;
  exception when unique_violation then
    select id into new_id from public.events
    where baby_id = target_baby_id and type = session_type and ended_at is null and deleted_at is null;
    return new_id;
  end;

  if session_type in ('breast_feed', 'pump') then
    insert into public.session_details (event_id, state) values (new_id, 'running');
    insert into public.timed_segments (event_id, side, started_at)
    values (new_id, coalesce(start_side, 'left'), now());
  end if;
  return new_id;
end;
$$;

create function public.switch_side(target_event_id uuid, new_side public.side)
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

create function public.pause_session(target_event_id uuid)
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
  update public.timed_segments set ended_at = now() where event_id = current_session.id and ended_at is null;
  update public.session_details set state = 'paused' where event_id = current_session.id;
  update public.events set updated_at = now() where id = current_session.id;
end;
$$;

create function public.resume_session(target_event_id uuid, resume_side public.side default null)
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
  if exists (select 1 from public.timed_segments where event_id = current_session.id and ended_at is null) then
    return;
  end if;
  select side into last_side from public.timed_segments where event_id = current_session.id order by started_at desc limit 1;
  insert into public.timed_segments (event_id, side, started_at)
  values (current_session.id, coalesce(resume_side, last_side, 'left'), now());
  update public.session_details set state = 'running' where event_id = current_session.id;
  update public.events set updated_at = now() where id = current_session.id;
end;
$$;

create function public.end_session(target_event_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_session public.events := private.lock_running_session(target_event_id);
  last_end timestamptz;
begin
  if current_session.ended_at is not null then
    return;
  end if;
  update public.timed_segments set ended_at = now() where event_id = current_session.id and ended_at is null;
  select max(ended_at) into last_end from public.timed_segments where event_id = current_session.id;
  update public.session_details set state = 'ended' where event_id = current_session.id;
  update public.events
  set ended_at = greatest(current_session.started_at, coalesce(last_end, now())), updated_at = now()
  where id = current_session.id;
end;
$$;

create function public.latest_events(target_baby_id uuid)
returns setof public.events
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct on (type) *
  from public.events
  where baby_id = target_baby_id and deleted_at is null
  order by type, started_at desc;
$$;

revoke execute on function public.save_event, public.start_session, public.switch_side, public.pause_session,
  public.resume_session, public.end_session, public.latest_events from public, anon;
grant execute on function public.save_event, public.start_session, public.switch_side, public.pause_session,
  public.resume_session, public.end_session, public.latest_events to authenticated;

alter publication supabase_realtime add table public.events;
