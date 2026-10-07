create type public.baby_sex as enum ('female', 'male');

alter table public.babies add column sex public.baby_sex;
