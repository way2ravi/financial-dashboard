create table if not exists public.company_news (
  id bigserial primary key,
  ticker_id bigint not null references public.tickers(id) on delete cascade,
  headline text not null,
  summary text,
  url text not null,
  image_url text,
  source_name text,
  published_at timestamptz not null,
  sentiment_label text,
  sentiment_score numeric,
  source text,
  source_updated_at timestamptz,
  fetched_at timestamptz not null default now(),
  unique (ticker_id, url)
);

create index if not exists company_news_ticker_published_idx
  on public.company_news (ticker_id, published_at desc);
