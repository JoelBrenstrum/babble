create or replace function private.record_event_end()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- merge_feeds hands the later feed's end over to the earlier one as it was recorded.
  if current_setting('babble.keep_event_end', true) = 'on' then
    return new;
  end if;
  if new.ended_at is null then
    new.ended_by := null;
    new.end_recorded_at := null;
  elsif old.ended_at is null then
    new.ended_by := auth.uid();
    new.end_recorded_at := now();
  else
    new.ended_by := old.ended_by;
    new.end_recorded_at := old.end_recorded_at;
  end if;
  return new;
end;
$$;

create function public.merge_feeds(earlier_id uuid, later_id uuid)
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
  if earlier.ended_at is null or later.started_at < earlier.ended_at
     or later.started_at - earlier.ended_at > interval '30 minutes' then
    raise exception 'Feeds can only be merged when the second starts within 30 minutes of the first ending'
      using errcode = 'PL007';
  end if;

  select state into later_state from public.session_details where event_id = later.id;

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

revoke all on function public.merge_feeds(uuid, uuid) from public, anon;
grant execute on function public.merge_feeds(uuid, uuid) to authenticated;
