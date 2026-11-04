create table public.custom_event_titles (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references public.babies (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80 and title = btrim(title)),
  created_at timestamptz not null default now()
);

create unique index custom_event_titles_baby_title_idx on public.custom_event_titles (baby_id, lower(title));

alter table public.custom_event_titles enable row level security;
create policy "members read custom event titles" on public.custom_event_titles
  for select to authenticated using (baby_id in (select private.my_baby_ids()));
create policy "editors add custom event titles" on public.custom_event_titles
  for insert to authenticated with check (baby_id in (select private.my_editor_baby_ids()));
create policy "editors delete custom event titles" on public.custom_event_titles
  for delete to authenticated using (baby_id in (select private.my_editor_baby_ids()));

revoke all on public.custom_event_titles from anon, authenticated;
grant select, insert, delete on public.custom_event_titles to authenticated;

create function private.enforce_custom_event_title_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('custom_event_titles' || new.baby_id::text));
  if (select count(*) from public.custom_event_titles where baby_id = new.baby_id) >= 40 then
    raise exception 'A baby can keep up to 40 custom event suggestions.' using errcode = 'PL009';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_custom_event_title_limit() from public, anon, authenticated;

create trigger custom_event_titles_enforce_limit before insert on public.custom_event_titles
  for each row execute function private.enforce_custom_event_title_limit();

create function private.seed_custom_event_titles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.custom_event_titles (baby_id, title, created_at)
  select new.id, title, now() + make_interval(secs => position)
  from unnest(array['Bath', 'Tummy time', 'Vitamin drops', 'Skin to skin', 'Walk']) with ordinality as t (title, position);
  return new;
end;
$$;

revoke all on function private.seed_custom_event_titles() from public, anon, authenticated;

create trigger babies_seed_custom_event_titles after insert on public.babies
  for each row execute function private.seed_custom_event_titles();

insert into public.custom_event_titles (baby_id, title, created_at)
select b.id, t.title, now() + make_interval(secs => t.position)
from public.babies b
cross join unnest(array['Bath', 'Tummy time', 'Vitamin drops', 'Skin to skin', 'Walk']) with ordinality as t (title, position);
