revoke insert, update on public.babies from authenticated;
grant insert (family_id, name, birth_date, timezone, day_start_minutes, sex) on public.babies to authenticated;
grant update (name, birth_date, timezone, day_start_minutes, sex) on public.babies to authenticated;

revoke update on public.baby_settings from authenticated;
grant update (
  feed_reminder_interval_min, feed_reminder_enabled, downtime_merge_threshold_sec,
  auto_end_paused_session_min, night_start_minutes, night_end_minutes, units
) on public.baby_settings to authenticated;

revoke insert on public.events from authenticated;
grant insert (id, baby_id, type, started_at, ended_at, notes, source, source_ref) on public.events to authenticated;

revoke update on public.sleep_details, public.session_details, public.timed_segments, public.bottle_details,
  public.nappy_details, public.pump_details, public.growth_details, public.custom_details
  from authenticated;
grant update (locations, fall_asleep, start_moods, end_moods, woken_by_carer) on public.sleep_details to authenticated;
grant update (state) on public.session_details to authenticated;
grant update (side, started_at, ended_at) on public.timed_segments to authenticated;
grant update (content, amount_ml, amount_left_ml) on public.bottle_details to authenticated;
grant update (wet, dirty, wet_size, poo_size, poo_colours, poo_textures, rash) on public.nappy_details to authenticated;
grant update (left_ml, right_ml, total_ml) on public.pump_details to authenticated;
grant update (weight_g, length_mm, head_circumference_mm) on public.growth_details to authenticated;
grant update (title, description) on public.custom_details to authenticated;

revoke execute on all functions in schema private from public;
alter default privileges in schema private revoke execute on functions from public;

alter table public.family_invites add column signed_up_at timestamptz;

create or replace function private.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text := '';
  byte integer;
begin
  while length(replace(code, '-', '')) < 10 loop
    byte := get_byte(extensions.gen_random_bytes(1), 0);
    -- Bytes at or above 248 are dropped so every character is equally likely.
    continue when byte >= 248;
    code := code || substr(alphabet, (byte % 31) + 1, 1);
    if length(code) = 5 then
      code := code || '-';
    end if;
  end loop;
  return code;
end;
$$;

create or replace function private.enforce_signup_mode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mode public.signup_mode;
  reserved uuid;
begin
  select signup_mode into mode from private.instance_settings;
  if mode = 'open' then
    return new;
  end if;
  if not exists (select 1 from auth.users) then
    return new;
  end if;
  update public.family_invites
  set signed_up_at = now()
  where id = (private.valid_invite(new.raw_user_meta_data ->> 'invite_code')).id and signed_up_at is null
  returning id into reserved;
  if reserved is null then
    raise exception 'Sign-up on this Babble server requires a valid invite code'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace function public.accept_invite(invite_code text, display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.family_invites;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  select * into invite from public.family_invites
  where code = upper(trim(invite_code)) and used_at is null and expires_at > now()
  for update;
  if invite.id is null then
    raise exception 'This invite code is invalid, used or expired' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.family_members where family_id = invite.family_id and user_id = auth.uid()) then
    return invite.family_id;
  end if;
  insert into public.family_members (family_id, user_id, role, display_name)
  values (invite.family_id, auth.uid(), invite.role, display_name);
  update public.family_invites set used_by = auth.uid(), used_at = now() where id = invite.id;
  return invite.family_id;
end;
$$;
