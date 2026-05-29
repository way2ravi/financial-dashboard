create or replace function public.get_cached_screener_rows()
returns table (
  ticker_id bigint,
  symbol text,
  name text,
  exchange text,
  price numeric,
  change numeric,
  change_percent numeric,
  volume numeric,
  market_cap numeric,
  pe numeric,
  year_high numeric,
  year_low numeric
)
language sql
stable
as $$
  with latest_fundamentals as (
    select distinct on (ticker_id)
      ticker_id,
      market_cap,
      pe
    from public.fundamentals_snapshot
    order by ticker_id, as_of_date desc
  ),
  ranges as (
    select
      ticker_id,
      max(high) as year_high,
      min(low) as year_low
    from public.ohlc_daily
    where date >= current_date - interval '370 days'
    group by ticker_id
  )
  select
    t.id as ticker_id,
    t.symbol,
    t.name,
    t.exchange,
    q.price,
    q.change,
    q.change_percent,
    q.volume,
    f.market_cap,
    f.pe,
    r.year_high,
    r.year_low
  from public.tickers t
  join public.quotes_latest q on q.ticker_id = t.id
  left join latest_fundamentals f on f.ticker_id = t.id
  left join ranges r on r.ticker_id = t.id
  where t.is_active = true;
$$;
