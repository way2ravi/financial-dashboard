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

alter table public.earnings_calendar enable row level security;

drop policy if exists "Public can read earnings calendar" on public.earnings_calendar;

create policy "Public can read earnings calendar"
on public.earnings_calendar
for select
to anon, authenticated
using (true);
