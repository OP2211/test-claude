create table if not exists public.team_cards_cache (
  team_id text primary key,
  team_name text not null,
  team_color text not null,
  team_logo text not null,
  rank integer,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  supporters_count integer not null default 0,
  top_supporters jsonb not null default '[]'::jsonb,
  last_five jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists team_cards_cache_set_updated_at on public.team_cards_cache;
create trigger team_cards_cache_set_updated_at
before update on public.team_cards_cache
for each row execute function public.set_updated_at();
