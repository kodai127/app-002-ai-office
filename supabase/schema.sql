create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  stripe_customer_id text,
  subscription_status text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimates (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id text references public.customers(id) on delete set null,
  customer_name text not null,
  project_name text not null,
  work_description text,
  hours numeric not null default 0,
  hourly_rate numeric not null default 0,
  amount numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted')),
  issued_at date not null default current_date,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id text references public.customers(id) on delete set null,
  name text not null,
  amount numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'estimated', 'invoiced', 'paid')),
  memo text,
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  estimate_id text references public.estimates(id) on delete set null,
  customer_id text references public.customers(id) on delete set null,
  customer_name text not null,
  project_name text not null,
  work_description text,
  hours numeric not null default 0,
  hourly_rate numeric not null default 0,
  amount numeric not null default 0,
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  issued_at date not null,
  due_date date not null,
  paid_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

alter table public.customers
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.estimates
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.projects
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.invoices
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.invoices
  drop constraint if exists invoices_invoice_number_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoices_user_invoice_number_key'
  ) then
    alter table public.invoices
      add constraint invoices_user_invoice_number_key unique (user_id, invoice_number);
  end if;
end $$;

create index if not exists estimates_user_issued_at_idx on public.estimates (user_id, issued_at desc);
create index if not exists projects_user_updated_at_idx on public.projects (user_id, updated_at desc);
create index if not exists projects_user_due_date_idx on public.projects (user_id, due_date asc);
create index if not exists projects_user_status_idx on public.projects (user_id, status);
create index if not exists invoices_user_issued_at_idx on public.invoices (user_id, issued_at desc);
create index if not exists customers_user_updated_at_idx on public.customers (user_id, updated_at desc);

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.estimates enable row level security;
alter table public.projects enable row level security;
alter table public.invoices enable row level security;

drop policy if exists "Allow public customer access during MVP" on public.customers;
drop policy if exists "Allow public estimate access during MVP" on public.estimates;
drop policy if exists "Allow public project access during MVP" on public.projects;
drop policy if exists "Allow public invoice access during MVP" on public.invoices;

create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can manage own customers"
on public.customers for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own estimates"
on public.estimates for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own projects" on public.projects;
create policy "Users can manage own projects"
on public.projects for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own invoices"
on public.invoices for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
