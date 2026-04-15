alter table if exists public.profiles
add column if not exists full_name text;

update public.profiles
set full_name = username
where full_name is null;
