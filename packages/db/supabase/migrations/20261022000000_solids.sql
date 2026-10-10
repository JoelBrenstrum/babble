alter type public.event_type add value 'solids' after 'bottle';
create type public.solids_amount as enum ('taste', 'some', 'lots');
create type public.solids_reaction as enum ('loved', 'liked', 'unsure', 'disliked');

create function private.valid_foods(foods text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(foods) between 1 and 20
    and not exists (select 1 from unnest(foods) food where char_length(food) not between 1 and 40);
$$;
grant execute on function private.valid_foods to authenticated;

create table public.solids_details (
  event_id uuid primary key references public.events (id) on delete cascade,
  foods text[] not null check (private.valid_foods(foods)),
  amount public.solids_amount,
  reaction public.solids_reaction
);

alter table public.solids_details enable row level security;
create policy "members read" on public.solids_details for select to authenticated
  using (private.is_family_member(private.event_family_id(event_id)));
create policy "editors write" on public.solids_details for all to authenticated
  using (private.can_edit_family(private.event_family_id(event_id)))
  with check (private.can_edit_family(private.event_family_id(event_id)));
revoke all on public.solids_details from anon, authenticated;
grant select, insert, delete on public.solids_details to authenticated;
grant update (foods, amount, reaction) on public.solids_details to authenticated;

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
    when 'solids' then
      insert into public.solids_details (event_id, foods, amount, reaction)
      values (
        saved_id,
        coalesce(array(select trim(food) from jsonb_array_elements_text(details -> 'foods') food), '{}'),
        (details ->> 'amount')::public.solids_amount,
        (details ->> 'reaction')::public.solids_reaction
      )
      on conflict on constraint solids_details_pkey do update
      set foods = excluded.foods, amount = excluded.amount, reaction = excluded.reaction;
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
