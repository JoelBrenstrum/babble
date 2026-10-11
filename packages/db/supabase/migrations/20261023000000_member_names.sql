alter table public.family_members
  add constraint family_members_display_name_not_blank check (btrim(display_name) <> '');

create policy "owners rename members, members rename themselves" on public.family_members
  for update to authenticated
  using (user_id = auth.uid() or private.has_family_role(family_id, array['owner']::public.family_role[]))
  with check (user_id = auth.uid() or private.has_family_role(family_id, array['owner']::public.family_role[]));

grant update (display_name) on public.family_members to authenticated;
