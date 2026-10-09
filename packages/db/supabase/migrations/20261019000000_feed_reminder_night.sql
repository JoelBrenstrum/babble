alter table public.baby_settings add column feed_reminder_at_night boolean not null default true;

grant update (feed_reminder_at_night) on public.baby_settings to authenticated;
