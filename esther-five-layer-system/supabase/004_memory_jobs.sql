create table if not exists public.memory_jobs (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  job_type text not null check (job_type in ('summary_update', 'crm_extract')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_memory_jobs_updated_at on public.memory_jobs;
create trigger trg_memory_jobs_updated_at
before update on public.memory_jobs
for each row
execute function public.set_updated_at();

create index if not exists idx_memory_jobs_status_created_at on public.memory_jobs(status, created_at);
