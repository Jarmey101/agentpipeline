create table if not exists public.processed_inbound_messages (
  id bigint generated always as identity primary key,
  message_sid text not null unique,
  phone text not null,
  raw_body text null,
  created_at timestamptz not null default now()
);

create index if not exists processed_inbound_messages_phone_idx
  on public.processed_inbound_messages (phone);

create index if not exists processed_inbound_messages_created_at_idx
  on public.processed_inbound_messages (created_at desc);
