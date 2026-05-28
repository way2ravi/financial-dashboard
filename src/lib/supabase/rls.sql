alter table public.users_profile enable row level security;
alter table public.tickers enable row level security;
alter table public.user_watchlist enable row level security;
alter table public.quotes_latest enable row level security;
alter table public.analyst_ratings_snapshot enable row level security;
alter table public.analyst_price_targets_snapshot enable row level security;
alter table public.earnings_quarterly enable row level security;
alter table public.fundamentals_snapshot enable row level security;
alter table public.ohlc_daily enable row level security;
alter table public.provider_fetch_log enable row level security;

create policy "Users can read own profile"
on public.users_profile
for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.users_profile
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can insert own profile"
on public.users_profile
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can read own watchlist"
on public.user_watchlist
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can add own watchlist items"
on public.user_watchlist
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can remove own watchlist items"
on public.user_watchlist
for delete
to authenticated
using (auth.uid() = user_id);

create policy "Public can read tickers"
on public.tickers
for select
to anon, authenticated
using (true);

create policy "Public can read latest quotes"
on public.quotes_latest
for select
to anon, authenticated
using (true);

create policy "Public can read analyst ratings"
on public.analyst_ratings_snapshot
for select
to anon, authenticated
using (true);

create policy "Public can read analyst price targets"
on public.analyst_price_targets_snapshot
for select
to anon, authenticated
using (true);

create policy "Public can read earnings"
on public.earnings_quarterly
for select
to anon, authenticated
using (true);

create policy "Public can read fundamentals"
on public.fundamentals_snapshot
for select
to anon, authenticated
using (true);

create policy "Public can read daily ohlc"
on public.ohlc_daily
for select
to anon, authenticated
using (true);

create policy "Admins can read provider logs"
on public.provider_fetch_log
for select
to authenticated
using (
  exists (
    select 1
    from public.users_profile
    where users_profile.id = auth.uid()
      and users_profile.role = 'admin'
  )
);
