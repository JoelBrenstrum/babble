alter table private.instance_settings add column billing_enabled boolean not null default false;

create function private.enforce_baby_limit()
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
  if exists (select 1 from public.babies where family_id = new.family_id) then
    raise exception 'Adding more than one baby to a family needs Babble Plus'
      using errcode = 'PL001';
  end if;
  return new;
end;
$$;

create trigger babies_enforce_limit before insert on public.babies
  for each row execute function private.enforce_baby_limit();
