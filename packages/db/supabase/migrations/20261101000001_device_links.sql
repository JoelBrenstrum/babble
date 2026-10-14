create table public.device_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[2-9A-HJ-NP-Z]{8}$'),
  secret_hash text not null,
  device text not null default '' check (char_length(device) <= 200),
  requested_from text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '5 minutes',
  approved_by uuid references auth.users (id) on delete cascade,
  approved_at timestamptz,
  consumed_at timestamptz
);

create index device_links_requested_from_idx on public.device_links (requested_from, created_at);
create index device_links_approved_by_idx on public.device_links (approved_by) where approved_by is not null;

alter table public.device_links enable row level security;
revoke all on public.device_links from anon, authenticated;

create function public.device_link_details(link_code text)
returns table (device text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select l.device, l.expires_at from public.device_links l
  where l.code = link_code and l.approved_by is null and l.expires_at > now() and (select auth.uid()) is not null;
$$;

create function public.approve_device_link(link_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  update public.device_links
  set approved_by = (select auth.uid()), approved_at = now()
  where code = link_code and approved_by is null and expires_at > now();
  if not found then
    raise exception 'This code has expired or was already used' using errcode = 'PL005';
  end if;
end;
$$;

revoke all on function public.device_link_details(text) from public, anon;
revoke all on function public.approve_device_link(text) from public, anon;
grant execute on function public.device_link_details(text) to authenticated;
grant execute on function public.approve_device_link(text) to authenticated;

create function public.start_device_link(
  new_code text,
  new_secret_hash text,
  new_device text,
  new_requested_from text default null
)
returns table (id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.device_links l where l.created_at < now() - interval '1 day';
  if new_requested_from is not null and (
    select count(*) from public.device_links l
    where l.requested_from = new_requested_from and l.created_at > now() - interval '10 minutes'
  ) >= 10 then
    raise exception 'Too many sign-in codes. Try again in a few minutes.' using errcode = 'PL006';
  end if;
  return query
    insert into public.device_links (code, secret_hash, device, requested_from)
    values (new_code, new_secret_hash, left(coalesce(new_device, ''), 200), new_requested_from)
    returning device_links.id, device_links.expires_at;
end;
$$;

create function public.claim_device_link(link_id uuid, link_secret_hash text)
returns table (status text, email text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  link public.device_links;
begin
  select * into link from public.device_links l where l.id = link_id and l.secret_hash = link_secret_hash;
  if link.id is null or link.consumed_at is not null then
    return query select 'expired'::text, null::text;
  elsif link.approved_by is null then
    return query select (case when link.expires_at > now() then 'pending' else 'expired' end)::text, null::text;
  elsif link.approved_at < now() - interval '2 minutes' then
    return query select 'expired'::text, null::text;
  else
    update public.device_links set consumed_at = now() where device_links.id = link.id;
    return query select 'approved'::text, u.email::text from auth.users u where u.id = link.approved_by;
  end if;
end;
$$;

revoke all on function public.start_device_link(text, text, text, text) from public, anon, authenticated;
revoke all on function public.claim_device_link(uuid, text) from public, anon, authenticated;
grant execute on function public.start_device_link(text, text, text, text) to service_role;
grant execute on function public.claim_device_link(uuid, text) to service_role;
