create index family_members_user_family_idx on public.family_members (user_id, family_id);
drop index public.family_members_user_id_idx;

create index events_created_by_idx on public.events (created_by) where created_by is not null;
create index events_ended_by_idx on public.events (ended_by) where ended_by is not null;
create index family_invites_created_by_idx on public.family_invites (created_by);
create index family_invites_used_by_idx on public.family_invites (used_by) where used_by is not null;

create function private.my_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.family_members where user_id = (select auth.uid());
$$;

create function private.my_editor_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.family_members
  where user_id = (select auth.uid()) and role in ('owner', 'caregiver');
$$;

create function private.my_owner_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.family_members where user_id = (select auth.uid()) and role = 'owner';
$$;

create function private.my_baby_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id from public.babies b
  join public.family_members m on m.family_id = b.family_id
  where m.user_id = (select auth.uid());
$$;

create function private.my_editor_baby_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.id from public.babies b
  join public.family_members m on m.family_id = b.family_id
  where m.user_id = (select auth.uid()) and m.role in ('owner', 'caregiver');
$$;

grant execute on function private.my_family_ids, private.my_editor_family_ids, private.my_owner_family_ids,
  private.my_baby_ids, private.my_editor_baby_ids to authenticated;

drop policy "members read their families" on public.families;
drop policy "owners rename their families" on public.families;
create policy "members read their families" on public.families
  for select to authenticated using (id in (select private.my_family_ids()));
create policy "owners rename their families" on public.families
  for update to authenticated
  using (id in (select private.my_owner_family_ids()))
  with check (id in (select private.my_owner_family_ids()));

drop policy "members read fellow members" on public.family_members;
drop policy "members leave, owners remove" on public.family_members;
drop policy "owners rename members, members rename themselves" on public.family_members;
create policy "members read fellow members" on public.family_members
  for select to authenticated using (family_id in (select private.my_family_ids()));
create policy "members leave, owners remove" on public.family_members
  for delete to authenticated
  using (user_id = (select auth.uid()) or family_id in (select private.my_owner_family_ids()));
create policy "owners rename members, members rename themselves" on public.family_members
  for update to authenticated
  using (user_id = (select auth.uid()) or family_id in (select private.my_owner_family_ids()))
  with check (user_id = (select auth.uid()) or family_id in (select private.my_owner_family_ids()));

drop policy "members read babies" on public.babies;
drop policy "editors add babies" on public.babies;
drop policy "editors update babies" on public.babies;
drop policy "owners delete babies" on public.babies;
create policy "members read babies" on public.babies
  for select to authenticated using (family_id in (select private.my_family_ids()));
create policy "editors add babies" on public.babies
  for insert to authenticated with check (family_id in (select private.my_editor_family_ids()));
create policy "editors update babies" on public.babies
  for update to authenticated
  using (family_id in (select private.my_editor_family_ids()))
  with check (family_id in (select private.my_editor_family_ids()));
create policy "owners delete babies" on public.babies
  for delete to authenticated using (family_id in (select private.my_owner_family_ids()));

drop policy "members read baby settings" on public.baby_settings;
drop policy "editors update baby settings" on public.baby_settings;
create policy "members read baby settings" on public.baby_settings
  for select to authenticated using (baby_id in (select private.my_baby_ids()));
create policy "editors update baby settings" on public.baby_settings
  for update to authenticated
  using (baby_id in (select private.my_editor_baby_ids()))
  with check (baby_id in (select private.my_editor_baby_ids()));

drop policy "editors read invites" on public.family_invites;
drop policy "editors revoke invites" on public.family_invites;
create policy "editors read invites" on public.family_invites
  for select to authenticated using (family_id in (select private.my_editor_family_ids()));
create policy "editors revoke invites" on public.family_invites
  for delete to authenticated using (family_id in (select private.my_editor_family_ids()));

drop policy "members read family settings" on public.family_settings;
drop policy "editors update family settings" on public.family_settings;
create policy "members read family settings" on public.family_settings
  for select to authenticated using (family_id in (select private.my_family_ids()));
create policy "editors update family settings" on public.family_settings
  for update to authenticated
  using (family_id in (select private.my_editor_family_ids()))
  with check (family_id in (select private.my_editor_family_ids()));

drop policy "members read events" on public.events;
drop policy "editors add events" on public.events;
drop policy "editors update events" on public.events;
create policy "members read events" on public.events
  for select to authenticated using (baby_id in (select private.my_baby_ids()));
create policy "editors add events" on public.events
  for insert to authenticated with check (baby_id in (select private.my_editor_baby_ids()));
create policy "editors update events" on public.events
  for update to authenticated
  using (baby_id in (select private.my_editor_baby_ids()))
  with check (baby_id in (select private.my_editor_baby_ids()));

do $$
declare
  child text;
begin
  foreach child in array array[
    'sleep_details', 'session_details', 'timed_segments', 'bottle_details', 'solids_details',
    'nappy_details', 'pump_details', 'growth_details', 'custom_details'
  ] loop
    execute format('drop policy "members read" on public.%I', child);
    execute format('drop policy "editors write" on public.%I', child);
    execute format(
      'create policy "members read" on public.%1$I for select to authenticated
         using (exists (select 1 from public.events e where e.id = %1$I.event_id))', child);
    execute format(
      'create policy "editors insert" on public.%1$I for insert to authenticated
         with check (exists (
           select 1 from public.events e
           where e.id = %1$I.event_id and e.baby_id in (select private.my_editor_baby_ids())))', child);
    execute format(
      'create policy "editors update" on public.%1$I for update to authenticated
         using (exists (
           select 1 from public.events e
           where e.id = %1$I.event_id and e.baby_id in (select private.my_editor_baby_ids())))
         with check (exists (
           select 1 from public.events e
           where e.id = %1$I.event_id and e.baby_id in (select private.my_editor_baby_ids())))', child);
    execute format(
      'create policy "editors delete" on public.%1$I for delete to authenticated
         using (exists (
           select 1 from public.events e
           where e.id = %1$I.event_id and e.baby_id in (select private.my_editor_baby_ids())))', child);
  end loop;
end;
$$;

revoke execute on function private.baby_family_id, private.event_family_id from authenticated;
