create type public.custom_event_kind as enum ('note', 'duration', 'amount');

alter table public.custom_event_titles
  add column kind public.custom_event_kind not null default 'note',
  add column unit text check (char_length(unit) between 1 and 20 and unit = btrim(unit)),
  add constraint custom_event_titles_amount_unit check ((kind = 'amount') = (unit is not null));

grant insert (kind, unit) on public.custom_event_titles to authenticated;

alter table public.custom_details
  add column kind public.custom_event_kind not null default 'note',
  add column amount numeric check (amount > 0 and amount <= 100000),
  add column unit text check (char_length(unit) between 1 and 20),
  add constraint custom_details_amount_kind check (kind = 'amount' or (amount is null and unit is null));

grant update (kind, amount, unit) on public.custom_details to authenticated;

update public.custom_details d
set kind = 'duration'
from public.events e
where e.id = d.event_id and e.ended_at - e.started_at >= interval '1 minute';

update public.custom_event_titles t
set kind = s.kind, unit = s.unit
from (
  values ('tummy time', 'duration'::public.custom_event_kind, null), ('skin to skin', 'duration', null),
         ('walk', 'duration', null), ('vitamin drops', 'amount', 'drops')
) as s (title, kind, unit)
where lower(t.title) = s.title;

create or replace function private.seed_custom_event_titles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.custom_event_titles (baby_id, title, kind, unit, created_at)
  select new.id, t.title, t.kind, t.unit, now() + make_interval(secs => t.position)
  from (
    values (1, 'Bath', 'note'::public.custom_event_kind, null), (2, 'Tummy time', 'duration', null),
           (3, 'Vitamin drops', 'amount', 'drops'), (4, 'Skin to skin', 'duration', null), (5, 'Walk', 'duration', null)
  ) as t (position, title, kind, unit);
  return new;
end;
$$;

create or replace function private.save_custom_details(saved_id uuid, details jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.custom_details (event_id, title, description, kind, amount, unit)
  values (
    saved_id,
    trim(details ->> 'title'),
    coalesce(trim(details ->> 'description'), ''),
    coalesce((details ->> 'kind')::public.custom_event_kind, 'note'),
    (details ->> 'amount')::numeric,
    nullif(trim(details ->> 'unit'), '')
  )
  on conflict on constraint custom_details_pkey do update
  set title = excluded.title, description = excluded.description, kind = excluded.kind, amount = excluded.amount,
      unit = excluded.unit;
$$;
