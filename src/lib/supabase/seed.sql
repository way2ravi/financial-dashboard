insert into public.tickers (
  symbol,
  exchange,
  name,
  sector,
  industry,
  currency,
  is_active
)
values (
  'AAPL',
  'NASDAQ',
  'Apple Inc.',
  'Technology',
  'Consumer Electronics',
  'USD',
  true
),
(
  'NVDA',
  'NASDAQ',
  'NVIDIA Corporation',
  'Technology',
  'Semiconductors',
  'USD',
  true
),
(
  'MSFT',
  'NASDAQ',
  'Microsoft Corporation',
  'Technology',
  'Software - Infrastructure',
  'USD',
  true
),
(
  'GOOGL',
  'NASDAQ',
  'Alphabet Inc.',
  'Communication Services',
  'Internet Content & Information',
  'USD',
  true
),
(
  'AMZN',
  'NASDAQ',
  'Amazon.com, Inc.',
  'Consumer Cyclical',
  'Internet Retail',
  'USD',
  true
),
(
  'META',
  'NASDAQ',
  'Meta Platforms, Inc.',
  'Communication Services',
  'Internet Content & Information',
  'USD',
  true
),
(
  'TSLA',
  'NASDAQ',
  'Tesla, Inc.',
  'Consumer Cyclical',
  'Auto Manufacturers',
  'USD',
  true
),
(
  'AMD',
  'NASDAQ',
  'Advanced Micro Devices, Inc.',
  'Technology',
  'Semiconductors',
  'USD',
  true
),
(
  'IBM',
  'NYSE',
  'International Business Machines Corporation',
  'Technology',
  'Information Technology Services',
  'USD',
  true
),
(
  'JPM',
  'NYSE',
  'JPMorgan Chase & Co.',
  'Financial Services',
  'Banks - Diversified',
  'USD',
  true
),
(
  'BRK.B',
  'NYSE',
  'Berkshire Hathaway Inc.',
  'Financial Services',
  'Insurance - Diversified',
  'USD',
  true
)
on conflict (symbol) do update set
  exchange = excluded.exchange,
  name = excluded.name,
  sector = excluded.sector,
  industry = excluded.industry,
  currency = excluded.currency,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.quotes_latest (
  ticker_id,
  price,
  change,
  change_percent,
  previous_close,
  open,
  day_high,
  day_low,
  volume,
  source,
  source_updated_at,
  fetched_at
)
select
  id,
  189.50,
  1.25,
  0.66,
  188.25,
  188.90,
  190.10,
  187.80,
  52300000,
  'manual',
  '2026-05-28 00:00:00+00',
  now()
from public.tickers
where symbol = 'AAPL'
on conflict (ticker_id) do update set
  price = excluded.price,
  change = excluded.change,
  change_percent = excluded.change_percent,
  previous_close = excluded.previous_close,
  open = excluded.open,
  day_high = excluded.day_high,
  day_low = excluded.day_low,
  volume = excluded.volume,
  source = excluded.source,
  source_updated_at = excluded.source_updated_at,
  fetched_at = now();

insert into public.analyst_ratings_snapshot (
  ticker_id,
  as_of_date,
  consensus,
  strong_buy,
  buy,
  hold,
  sell,
  strong_sell,
  analyst_count,
  source,
  source_updated_at,
  fetched_at
)
select
  id,
  '2026-05-01',
  'Buy',
  12,
  18,
  5,
  1,
  0,
  36,
  'manual',
  '2026-05-01 00:00:00+00',
  now()
from public.tickers
where symbol = 'AAPL'
on conflict (ticker_id, as_of_date) do update set
  consensus = excluded.consensus,
  strong_buy = excluded.strong_buy,
  buy = excluded.buy,
  hold = excluded.hold,
  sell = excluded.sell,
  strong_sell = excluded.strong_sell,
  analyst_count = excluded.analyst_count,
  source = excluded.source,
  source_updated_at = excluded.source_updated_at,
  fetched_at = now();

insert into public.analyst_price_targets_snapshot (
  ticker_id,
  as_of_date,
  target_low,
  target_mean,
  target_high,
  target_median,
  analyst_count,
  source,
  source_updated_at,
  fetched_at
)
select
  id,
  '2026-05-01',
  150,
  205,
  220,
  204,
  36,
  'manual',
  '2026-05-01 00:00:00+00',
  now()
from public.tickers
where symbol = 'AAPL'
on conflict (ticker_id, as_of_date) do update set
  target_low = excluded.target_low,
  target_mean = excluded.target_mean,
  target_high = excluded.target_high,
  target_median = excluded.target_median,
  analyst_count = excluded.analyst_count,
  source = excluded.source,
  source_updated_at = excluded.source_updated_at,
  fetched_at = now();

insert into public.earnings_quarterly (
  ticker_id,
  fiscal_year,
  fiscal_quarter,
  period,
  report_date,
  eps_actual,
  eps_estimate,
  eps_surprise,
  eps_surprise_percent,
  revenue_actual,
  revenue_estimate,
  source,
  source_updated_at,
  fetched_at
)
select
  t.id,
  e.fiscal_year,
  e.fiscal_quarter,
  e.period,
  e.report_date,
  e.eps_actual,
  e.eps_estimate,
  e.eps_surprise,
  e.eps_surprise_percent,
  e.revenue_actual,
  e.revenue_estimate,
  'manual',
  e.report_date::timestamptz,
  now()
from public.tickers t
cross join (
  values
    (2026, 1, 'Q1 2026', '2026-04-30'::date, 2.11, 2.03, 0.08, 3.94, 118000000000::numeric, 116500000000::numeric),
    (2025, 4, 'Q4 2025', '2026-01-31'::date, 1.96, 1.91, 0.05, 2.62, 104800000000::numeric, 103900000000::numeric),
    (2025, 3, 'Q3 2025', '2025-10-30'::date, 1.64, 1.59, 0.05, 3.14, 92500000000::numeric, 91400000000::numeric),
    (2025, 2, 'Q2 2025', '2025-07-31'::date, 1.47, 1.43, 0.04, 2.80, 85800000000::numeric, 84900000000::numeric)
) as e(
  fiscal_year,
  fiscal_quarter,
  period,
  report_date,
  eps_actual,
  eps_estimate,
  eps_surprise,
  eps_surprise_percent,
  revenue_actual,
  revenue_estimate
)
where t.symbol = 'AAPL'
on conflict (ticker_id, fiscal_year, fiscal_quarter) do update set
  period = excluded.period,
  report_date = excluded.report_date,
  eps_actual = excluded.eps_actual,
  eps_estimate = excluded.eps_estimate,
  eps_surprise = excluded.eps_surprise,
  eps_surprise_percent = excluded.eps_surprise_percent,
  revenue_actual = excluded.revenue_actual,
  revenue_estimate = excluded.revenue_estimate,
  source = excluded.source,
  source_updated_at = excluded.source_updated_at,
  fetched_at = now();

insert into public.fundamentals_snapshot (
  ticker_id,
  as_of_date,
  market_cap,
  pe,
  forward_pe,
  peg,
  pb,
  ps,
  roe,
  roa,
  gross_margin,
  operating_margin,
  net_margin,
  debt_to_equity,
  dividend_yield,
  beta,
  source,
  source_updated_at,
  fetched_at
)
select
  id,
  '2026-05-28',
  3180000000000,
  28.4,
  24.8,
  1.9,
  12.3,
  7.4,
  45.2,
  19.6,
  46.1,
  31.8,
  25.4,
  1.45,
  0.52,
  1.18,
  'manual',
  '2026-05-28 00:00:00+00',
  now()
from public.tickers
where symbol = 'AAPL'
on conflict (ticker_id, as_of_date) do update set
  market_cap = excluded.market_cap,
  pe = excluded.pe,
  forward_pe = excluded.forward_pe,
  peg = excluded.peg,
  pb = excluded.pb,
  ps = excluded.ps,
  roe = excluded.roe,
  roa = excluded.roa,
  gross_margin = excluded.gross_margin,
  operating_margin = excluded.operating_margin,
  net_margin = excluded.net_margin,
  debt_to_equity = excluded.debt_to_equity,
  dividend_yield = excluded.dividend_yield,
  beta = excluded.beta,
  source = excluded.source,
  source_updated_at = excluded.source_updated_at,
  fetched_at = now();

insert into public.ohlc_daily (
  ticker_id,
  date,
  open,
  high,
  low,
  close,
  adjusted_close,
  volume,
  source,
  fetched_at
)
select
  t.id,
  p.date,
  p.open,
  p.high,
  p.low,
  p.close,
  p.close,
  p.volume,
  'manual',
  now()
from public.tickers t
cross join (
  values
    ('2026-05-17'::date, 181, 184, 180, 183, 41800000::numeric),
    ('2026-05-18'::date, 183, 186, 182, 185, 45500000::numeric),
    ('2026-05-19'::date, 185, 187, 184, 186, 46900000::numeric),
    ('2026-05-20'::date, 186, 188, 184, 185, 44100000::numeric),
    ('2026-05-21'::date, 185, 189, 185, 188, 48700000::numeric),
    ('2026-05-22'::date, 188, 190, 187, 189, 50200000::numeric),
    ('2026-05-23'::date, 189, 191, 188, 190, 52300000::numeric)
) as p(date, open, high, low, close, volume)
where t.symbol = 'AAPL'
on conflict (ticker_id, date) do update set
  open = excluded.open,
  high = excluded.high,
  low = excluded.low,
  close = excluded.close,
  adjusted_close = excluded.adjusted_close,
  volume = excluded.volume,
  source = excluded.source,
  fetched_at = now();
