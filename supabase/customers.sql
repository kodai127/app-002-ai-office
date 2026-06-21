create table if not exists public.customers (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.customers
  add column if not exists name text not null default '新規顧客';

alter table public.customers
  add column if not exists contact_name text;

alter table public.customers
  add column if not exists email text;

alter table public.customers
  add column if not exists phone text;

alter table public.customers
  add column if not exists address text;

alter table public.customers
  add column if not exists memo text;

alter table public.customers
  add column if not exists created_at timestamptz not null default now();

alter table public.customers
  add column if not exists updated_at timestamptz not null default now();

create index if not exists customers_user_updated_at_idx on public.customers (user_id, updated_at desc);

alter table public.customers enable row level security;

drop policy if exists "Allow public customer access during MVP" on public.customers;
drop policy if exists "Users can manage own customers" on public.customers;

create policy "Users can manage own customers"
on public.customers for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
