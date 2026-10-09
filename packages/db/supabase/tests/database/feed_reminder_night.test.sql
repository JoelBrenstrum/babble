begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

select col_not_null('public', 'baby_settings', 'feed_reminder_at_night', 'night reminders is always set');
select col_default_is('public', 'baby_settings', 'feed_reminder_at_night', 'true', 'night reminders stay on by default');
select ok(
  has_column_privilege('authenticated', 'public.baby_settings', 'feed_reminder_at_night', 'UPDATE'),
  'family members can change night reminders'
);

select * from finish();
rollback;
