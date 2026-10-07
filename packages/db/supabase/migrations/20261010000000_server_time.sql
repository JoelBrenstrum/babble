create function public.server_time()
returns timestamptz
language sql
volatile
set search_path = ''
as $$
  select clock_timestamp();
$$;

grant execute on function public.server_time to anon, authenticated;
