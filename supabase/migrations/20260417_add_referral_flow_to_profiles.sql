alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists invited_by_google_sub text;

update public.profiles
set referral_code = replace(id::text, '-', '')
where referral_code is null;

alter table public.profiles
  alter column referral_code set not null;

create unique index if not exists profiles_referral_code_unique_idx
  on public.profiles (referral_code);

create index if not exists profiles_invited_by_google_sub_idx
  on public.profiles (invited_by_google_sub);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_invited_by_google_sub_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_invited_by_google_sub_fkey
      foreign key (invited_by_google_sub)
      references public.profiles (google_sub)
      on delete set null;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_no_self_referral_chk'
  ) then
    alter table public.profiles
      add constraint profiles_no_self_referral_chk
      check (invited_by_google_sub is null or invited_by_google_sub <> google_sub);
  end if;
end
$$;

create or replace function public.set_referral_code()
returns trigger
language plpgsql
as $$
begin
  if new.referral_code is null or btrim(new.referral_code) = '' then
    new.referral_code = replace(new.id::text, '-', '');
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_referral_code on public.profiles;
create trigger profiles_set_referral_code
before insert on public.profiles
for each row execute function public.set_referral_code();
