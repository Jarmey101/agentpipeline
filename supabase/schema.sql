-- AgentPipeline MVP schema

create extension if not exists pgcrypto;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  lead_type text not null default 'Buyer',
  timeline text not null default '0-3 months',
  budget text null,
  area text null,
  status text not null default 'New',
  notes text null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_leads_created_at on leads(created_at desc);
create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_type on leads(lead_type);
