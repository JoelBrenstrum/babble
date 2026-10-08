-- Only the keys present in changes are written, so two quick edits can't overwrite each other's fields.
create function public.save_sleep_details(target_event_id uuid, changes jsonb)
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
        then coalesce((changes ->> 'woken_by_carer')::boolean, false) else woken_by_carer end
  where event_id = target_event_id;
end;
$$;

revoke execute on function public.save_sleep_details from public, anon;
grant execute on function public.save_sleep_details to authenticated;
