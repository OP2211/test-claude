create table if not exists public.chat_messages (
  id text primary key,
  match_id text not null,
  tab text not null check (tab in ('predictions', 'teamsheet', 'banter')),
  user_id text not null,
  username text not null,
  fan_team_id text null,
  image text null,
  text text not null,
  timestamp timestamptz not null default now(),
  reactions jsonb not null default '{}'::jsonb,
  moderation jsonb null
);

create index if not exists chat_messages_match_tab_time_idx
  on public.chat_messages (match_id, tab, timestamp asc);
