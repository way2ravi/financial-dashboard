-- Net worth / wealth manager module (run on existing Supabase projects)

create table if not exists public.wealth_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  base_currency text not null default 'USD',
  monthly_expenses_estimate numeric check (monthly_expenses_estimate is null or monthly_expenses_estimate >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wealth_items (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (record_type in ('asset', 'liability')),
  category text not null check (
    category in (
      'liquid',
      'fixed',
      'investment',
      'loan',
      'overdraft',
      'credit_card',
      'other_debt'
    )
  ),
  subcategory text not null,
  name text not null,
  current_value numeric not null check (current_value > 0),
  interest_rate numeric check (interest_rate is null or interest_rate >= 0),
  monthly_payment numeric check (monthly_payment is null or monthly_payment >= 0),
  as_of_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (record_type = 'asset' and category in ('liquid', 'fixed', 'investment'))
    or (
      record_type = 'liability'
      and category in ('loan', 'overdraft', 'credit_card', 'other_debt')
    )
  )
);

create index if not exists wealth_items_user_id_idx
  on public.wealth_items (user_id, record_type, category);

alter table public.wealth_user_settings enable row level security;
alter table public.wealth_items enable row level security;

drop policy if exists "Users can read own wealth settings" on public.wealth_user_settings;
drop policy if exists "Users can insert own wealth settings" on public.wealth_user_settings;
drop policy if exists "Users can update own wealth settings" on public.wealth_user_settings;
drop policy if exists "Users can read own wealth items" on public.wealth_items;
drop policy if exists "Users can create own wealth items" on public.wealth_items;
drop policy if exists "Users can update own wealth items" on public.wealth_items;
drop policy if exists "Users can delete own wealth items" on public.wealth_items;

create policy "Users can read own wealth settings"
on public.wealth_user_settings
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own wealth settings"
on public.wealth_user_settings
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own wealth settings"
on public.wealth_user_settings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read own wealth items"
on public.wealth_items
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own wealth items"
on public.wealth_items
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own wealth items"
on public.wealth_items
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own wealth items"
on public.wealth_items
for delete
to authenticated
using (auth.uid() = user_id);
