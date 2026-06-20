create table if not exists public.customers (
  id text primary key,
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

create table if not exists public.invoices (
  id text primary key,
  estimate_id text references public.estimates(id) on delete set null,
  customer_id text references public.customers(id) on delete set null,
  customer_name text not null,
  project_name text not null,
  work_description text,
  hours numeric not null default 0,
  hourly_rate numeric not null default 0,
  amount numeric not null default 0,
  invoice_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue')),
  issued_at date not null,
  due_date date not null,
  paid_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists estimates_issued_at_idx on public.estimates (issued_at desc);
create index if not exists invoices_issued_at_idx on public.invoices (issued_at desc);
create index if not exists customers_updated_at_idx on public.customers (updated_at desc);

alter table public.customers enable row level security;
alter table public.estimates enable row level security;
alter table public.invoices enable row level security;

create policy "Allow public customer access during MVP"
on public.customers for all
using (true)
with check (true);

create policy "Allow public estimate access during MVP"
on public.estimates for all
using (true)
with check (true);

create policy "Allow public invoice access during MVP"
on public.invoices for all
using (true)
with check (true);
