-- Only the sides present in changes are written, so quick edits to one side can't overwrite the other.
create function public.save_pump_amounts(target_event_id uuid, changes jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.events
  set updated_at = now()
  where id = target_event_id and type = 'pump' and deleted_at is null;
  if not found then
    raise exception 'Pump not found' using errcode = 'P0002';
  end if;

  insert into public.pump_details (event_id) values (target_event_id) on conflict do nothing;
  update public.pump_details
  set left_ml = case when changes ? 'left_ml' then (changes ->> 'left_ml')::integer else left_ml end,
      right_ml = case when changes ? 'right_ml' then (changes ->> 'right_ml')::integer else right_ml end,
      total_ml = null
  where event_id = target_event_id;
end;
$$;

revoke execute on function public.save_pump_amounts from public, anon;
grant execute on function public.save_pump_amounts to authenticated;
