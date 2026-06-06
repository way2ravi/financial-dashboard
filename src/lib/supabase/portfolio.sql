create table if not exists public.portfolios (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  asset_class text not null default 'stocks' check (asset_class in ('stocks', 'crypto', 'commodity', 'real_estate', 'other')),
  base_currency text not null default 'USD',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create index if not exists portfolios_user_id_idx on public.portfolios (user_id);

create table if not exists public.portfolio_transactions (
  id bigserial primary key,
  portfolio_id bigint not null references public.portfolios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_class text not null default 'stocks' check (asset_class in ('stocks', 'crypto', 'commodity', 'real_estate', 'other')),
  ticker_id bigint references public.tickers(id) on delete restrict,
  asset_symbol text,
  asset_name text,
  transaction_type text not null check (transaction_type in ('buy', 'sell', 'valuation')),
  trade_date date not null,
  quantity numeric not null check (quantity > 0),
  price numeric not null check (price >= 0),
  fees numeric not null default 0 check (fees >= 0),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (portfolio_id, user_id) references public.portfolios(id, user_id) on delete cascade
);

alter table public.portfolios
  add column if not exists asset_class text not null default 'stocks';

alter table public.portfolios
  drop constraint if exists portfolios_asset_class_check;

alter table public.portfolios
  add constraint portfolios_asset_class_check
  check (asset_class in ('stocks', 'crypto', 'commodity', 'real_estate', 'other'));

alter table public.portfolio_transactions
  add column if not exists asset_class text not null default 'stocks',
  add column if not exists asset_symbol text,
  add column if not exists asset_name text;

alter table public.portfolio_transactions
  alter column ticker_id drop not null;

alter table public.portfolio_transactions
  drop constraint if exists portfolio_transactions_transaction_type_check;

alter table public.portfolio_transactions
  add constraint portfolio_transactions_transaction_type_check
  check (transaction_type in ('buy', 'sell', 'valuation'));

alter table public.portfolio_transactions
  drop constraint if exists portfolio_transactions_asset_class_check;

alter table public.portfolio_transactions
  add constraint portfolio_transactions_asset_class_check
  check (asset_class in ('stocks', 'crypto', 'commodity', 'real_estate', 'other'));

alter table public.portfolio_transactions
  drop constraint if exists portfolio_transactions_asset_identity_check;

alter table public.portfolio_transactions
  add constraint portfolio_transactions_asset_identity_check
  check (
    (asset_class = 'stocks' and ticker_id is not null)
    or (asset_class <> 'stocks' and coalesce(nullif(trim(asset_name), ''), nullif(trim(asset_symbol), '')) is not null)
  );

update public.portfolio_transactions
set asset_class = 'stocks'
where asset_class is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'portfolios_id_user_id_key'
      and conrelid = 'public.portfolios'::regclass
  ) then
    alter table public.portfolios
      add constraint portfolios_id_user_id_key unique (id, user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'portfolio_transactions_portfolio_id_user_id_fkey'
      and conrelid = 'public.portfolio_transactions'::regclass
  ) then
    alter table public.portfolio_transactions
      add constraint portfolio_transactions_portfolio_id_user_id_fkey
      foreign key (portfolio_id, user_id)
      references public.portfolios(id, user_id)
      on delete cascade;
  end if;
end $$;

create index if not exists portfolio_transactions_portfolio_id_idx
  on public.portfolio_transactions (portfolio_id, trade_date desc, id desc);

create index if not exists portfolio_transactions_user_id_idx
  on public.portfolio_transactions (user_id);

alter table public.portfolios enable row level security;
alter table public.portfolio_transactions enable row level security;

drop policy if exists "Users can read own portfolios" on public.portfolios;
drop policy if exists "Users can create own portfolios" on public.portfolios;
drop policy if exists "Users can update own portfolios" on public.portfolios;
drop policy if exists "Users can delete own portfolios" on public.portfolios;
drop policy if exists "Users can read own portfolio transactions" on public.portfolio_transactions;
drop policy if exists "Users can create own portfolio transactions" on public.portfolio_transactions;
drop policy if exists "Users can update own portfolio transactions" on public.portfolio_transactions;
drop policy if exists "Users can delete own portfolio transactions" on public.portfolio_transactions;

create policy "Users can read own portfolios"
on public.portfolios
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own portfolios"
on public.portfolios
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own portfolios"
on public.portfolios
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own portfolios"
on public.portfolios
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can read own portfolio transactions"
on public.portfolio_transactions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own portfolio transactions"
on public.portfolio_transactions
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.portfolios
    where portfolios.id = portfolio_transactions.portfolio_id
      and portfolios.user_id = auth.uid()
  )
);

create policy "Users can update own portfolio transactions"
on public.portfolio_transactions
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.portfolios
    where portfolios.id = portfolio_transactions.portfolio_id
      and portfolios.user_id = auth.uid()
  )
);

create policy "Users can delete own portfolio transactions"
on public.portfolio_transactions
for delete
to authenticated
using (auth.uid() = user_id);
