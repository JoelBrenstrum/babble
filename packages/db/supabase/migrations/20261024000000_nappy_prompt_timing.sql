create type public.nappy_prompt_timing as enum ('feed_start', 'first_side', 'feed_end', 'off');

alter table public.baby_settings
  add column nappy_prompt public.nappy_prompt_timing not null default 'feed_start';

grant update (nappy_prompt) on public.baby_settings to authenticated;
