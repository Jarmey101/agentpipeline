create table if not exists public.lead_profiles (
  phone text primary key,
  full_name text,
  email text,
  intent text check (intent in ('buyer', 'seller', 'renter', 'investor', 'other')),
  city text,
  state text,
  budget_min numeric,
  budget_max numeric,
  bedrooms numeric,
  bathrooms numeric,
  timeline text,
  financing_status text,
  notes text,
  last_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_lead_profiles_updated_at on public.lead_profiles;
create trigger trg_lead_profiles_updated_at
before update on public.lead_profiles
for each row
execute function public.set_updated_at();
