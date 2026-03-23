create table if not exists public.conversation_summaries (
  phone text primary key,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_conversation_summaries_updated_at on public.conversation_summaries;
create trigger trg_conversation_summaries_updated_at
before update on public.conversation_summaries
for each row
execute function public.set_updated_at();
