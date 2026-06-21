create table if not exists public.projects (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id text references public.customers(id) on delete set null,
  customer_name text not null default '顧客未設定',
  name text not null,
  amount numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'estimated', 'invoiced', 'paid')),
  memo text,
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.projects
  add column if not exists customer_id text references public.customers(id) on delete set null;

alter table public.projects
  add column if not exists customer_name text not null default '顧客未設定';

alter table public.projects
  add column if not exists name text not null default '新規案件';

alter table public.projects
  add column if not exists amount numeric not null default 0;

alter table public.projects
  add column if not exists status text not null default 'draft';

alter table public.projects
  add column if not exists memo text;

alter table public.projects
  add column if not exists due_date date not null default current_date;

alter table public.projects
  add column if not exists created_at timestamptz not null default now();

alter table public.projects
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_status_check'
  ) then
    alter table public.projects
      add constraint projects_status_check check (status in ('draft', 'estimated', 'invoiced', 'paid'));
  end if;
end $$;

create index if not exists projects_user_updated_at_idx on public.projects (user_id, updated_at desc);
create index if not exists projects_user_due_date_idx on public.projects (user_id, due_date asc);
create index if not exists projects_user_status_idx on public.projects (user_id, status);

alter table public.projects enable row level security;

drop policy if exists "Allow public project access during MVP" on public.projects;
drop policy if exists "Users can manage own projects" on public.projects;

create policy "Users can manage own projects"
on public.projects for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
