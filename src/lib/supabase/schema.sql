create extension if not exists pgcrypto;

create table if not exists public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tickers (
  id bigserial primary key,
  symbol text not null unique,
  exchange text,
  name text,
  sector text,
  industry text,
  currency text default 'USD',
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tickers_symbol_idx on public.tickers (symbol);
create index if not exists tickers_exchange_idx on public.tickers (exchange);

create table if not exists public.user_watchlist (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker_id bigint not null references public.tickers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, ticker_id)
);

create index if not exists user_watchlist_user_id_idx on public.user_watchlist (user_id);

create table if not exists public.portfolios (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
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
  ticker_id bigint not null references public.tickers(id) on delete restrict,
  transaction_type text not null check (transaction_type in ('buy', 'sell')),
  trade_date date not null,
  quantity numeric not null check (quantity > 0),
  price numeric not null check (price >= 0),
  fees numeric not null default 0 check (fees >= 0),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (portfolio_id, user_id) references public.portfolios(id, user_id) on delete cascade
);

create index if not exists portfolio_transactions_portfolio_id_idx
  on public.portfolio_transactions (portfolio_id, trade_date desc, id desc);

create index if not exists portfolio_transactions_user_id_idx
  on public.portfolio_transactions (user_id);

create table if not exists public.quotes_latest (
  ticker_id bigint primary key references public.tickers(id) on delete cascade,
  price numeric,
  change numeric,
  change_percent numeric,
  previous_close numeric,
  open numeric,
  day_high numeric,
  day_low numeric,
  volume numeric,
  source text,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now()
);

create table if not exists public.analyst_ratings_snapshot (
  id bigserial primary key,
  ticker_id bigint not null references public.tickers(id) on delete cascade,
  as_of_date date not null,
  consensus text,
  strong_buy int not null default 0,
  buy int not null default 0,
  hold int not null default 0,
  sell int not null default 0,
  strong_sell int not null default 0,
  analyst_count int not null default 0,
  source text,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (ticker_id, as_of_date)
);

create index if not exists analyst_ratings_ticker_date_idx
  on public.analyst_ratings_snapshot (ticker_id, as_of_date desc);

create table if not exists public.analyst_price_targets_snapshot (
  id bigserial primary key,
  ticker_id bigint not null references public.tickers(id) on delete cascade,
  as_of_date date not null,
  target_low numeric,
  target_mean numeric,
  target_high numeric,
  target_median numeric,
  analyst_count int,
  source text,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (ticker_id, as_of_date)
);

create index if not exists analyst_targets_ticker_date_idx
  on public.analyst_price_targets_snapshot (ticker_id, as_of_date desc);

create table if not exists public.earnings_quarterly (
  id bigserial primary key,
  ticker_id bigint not null references public.tickers(id) on delete cascade,
  fiscal_year int not null,
  fiscal_quarter int not null check (fiscal_quarter between 1 and 4),
  period text,
  report_date date,
  eps_actual numeric,
  eps_estimate numeric,
  eps_surprise numeric,
  eps_surprise_percent numeric,
  revenue_actual numeric,
  revenue_estimate numeric,
  source text,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (ticker_id, fiscal_year, fiscal_quarter)
);

create index if not exists earnings_ticker_period_idx
  on public.earnings_quarterly (ticker_id, fiscal_year desc, fiscal_quarter desc);

create table if not exists public.earnings_calendar (
  id bigserial primary key,
  symbol text not null,
  report_date date not null,
  hour text,
  fiscal_year int,
  fiscal_quarter int check (fiscal_quarter between 1 and 4),
  eps_actual numeric,
  eps_estimate numeric,
  revenue_actual numeric,
  revenue_estimate numeric,
  source text,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (symbol, report_date)
);

create index if not exists earnings_calendar_report_date_idx
  on public.earnings_calendar (report_date, symbol);

create table if not exists public.fundamentals_snapshot (
  id bigserial primary key,
  ticker_id bigint not null references public.tickers(id) on delete cascade,
  as_of_date date not null,
  market_cap numeric,
  pe numeric,
  forward_pe numeric,
  peg numeric,
  pb numeric,
  ps numeric,
  roe numeric,
  roa numeric,
  gross_margin numeric,
  operating_margin numeric,
  net_margin numeric,
  debt_to_equity numeric,
  dividend_yield numeric,
  beta numeric,
  source text,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (ticker_id, as_of_date)
);

create index if not exists fundamentals_ticker_date_idx
  on public.fundamentals_snapshot (ticker_id, as_of_date desc);

create table if not exists public.ohlc_daily (
  id bigserial primary key,
  ticker_id bigint not null references public.tickers(id) on delete cascade,
  date date not null,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  adjusted_close numeric,
  volume numeric,
  source text,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (ticker_id, date)
);

create index if not exists ohlc_daily_ticker_date_idx
  on public.ohlc_daily (ticker_id, date desc);

create table if not exists public.provider_fetch_log (
  id bigserial primary key,
  provider text not null,
  endpoint text not null,
  symbol text,
  status text not null check (status in ('success', 'error')),
  status_code int,
  error_message text,
  fetched_at timestamptz not null default now()
);

create index if not exists provider_fetch_log_symbol_idx
  on public.provider_fetch_log (symbol, fetched_at desc);
