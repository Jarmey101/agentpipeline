create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_phone_created_at on public.messages(phone, created_at);
