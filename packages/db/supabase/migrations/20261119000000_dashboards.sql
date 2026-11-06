create table public.dashboards (
  family_id uuid primary key references public.families (id) on delete cascade,
  layout jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger dashboards_touch_updated_at before update on public.dashboards
  for each row execute function private.touch_updated_at();

alter table public.dashboards enable row level security;
create policy "members read dashboards" on public.dashboards
  for select to authenticated using (family_id in (select private.my_family_ids()));
create policy "editors add dashboards" on public.dashboards
  for insert to authenticated with check (family_id in (select private.my_editor_family_ids()));
create policy "editors update dashboards" on public.dashboards
  for update to authenticated
  using (family_id in (select private.my_editor_family_ids()))
  with check (family_id in (select private.my_editor_family_ids()));

revoke all on public.dashboards from anon, authenticated;
-- Table-level update, not column-level: upsert's ON CONFLICT DO UPDATE sets every column in the payload.
grant select, insert, update on public.dashboards to authenticated;

alter publication supabase_realtime add table public.dashboards;
