create table public.reports (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  spec jsonb not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_family_idx on public.reports (family_id, created_at);

create trigger reports_touch_updated_at before update on public.reports
  for each row execute function private.touch_updated_at();

alter table public.reports enable row level security;
create policy "members read reports" on public.reports
  for select to authenticated using (family_id in (select private.my_family_ids()));
create policy "editors add reports" on public.reports
  for insert to authenticated
  with check (family_id in (select private.my_editor_family_ids()) and created_by = (select auth.uid()));
create policy "editors update reports" on public.reports
  for update to authenticated
  using (family_id in (select private.my_editor_family_ids()))
  with check (family_id in (select private.my_editor_family_ids()));
create policy "editors delete reports" on public.reports
  for delete to authenticated using (family_id in (select private.my_editor_family_ids()));

revoke all on public.reports from anon, authenticated;
grant select, insert, update (name, spec), delete on public.reports to authenticated;

create function private.enforce_report_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select billing_enabled from private.instance_settings) then
    return new;
  end if;
  if (select plan from public.families where id = new.family_id) = 'plus' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext(new.family_id::text));
  if (select count(*) from public.reports where family_id = new.family_id) >= 2 then
    raise exception 'A free family can save two reports. Babble Plus saves as many as you like.'
      using errcode = 'PL008';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_report_limit() from public, anon, authenticated;

create trigger reports_enforce_limit before insert on public.reports
  for each row execute function private.enforce_report_limit();

alter publication supabase_realtime add table public.reports;
