create table if not exists public.debug_api_health_logs (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  endpoint_name text not null,
  endpoint_path text not null,
  ok boolean not null,
  status integer,
  duration_ms integer,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists debug_api_health_logs_run_id_idx
  on public.debug_api_health_logs (run_id);

create index if not exists debug_api_health_logs_created_at_idx
  on public.debug_api_health_logs (created_at desc);
