begin;
create table if not exists public.ii_owner_access (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.ii_owner_access enable row level security;
revoke all on public.ii_owner_access from anon, authenticated;
grant select on public.ii_owner_access to authenticated;
create policy ii_read_own_access on public.ii_owner_access for select to authenticated using (user_id = auth.uid());
create or replace function public.ii_is_owner() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.ii_owner_access where user_id = auth.uid());
$$;
revoke all on function public.ii_is_owner() from public;
grant execute on function public.ii_is_owner() to authenticated;

create table public.ii_securities (
  ticker text primary key check(ticker ~ '^[A-Z0-9][A-Z0-9.-]{0,14}$'), name text, sector text, market_cap numeric,
  shares_outstanding numeric check(shares_outstanding > 0), denominator_date date, actions_verified_through date, metadata_source_url text, actions_review_source text
);
create table public.ii_institutions (cik text primary key check(cik ~ '^\d{10}$'), name text not null, enabled boolean not null default true, independence_group text);
create table public.ii_identifiers (
  ticker text not null references public.ii_securities(ticker), cusip text not null check(cusip ~ '^[A-Z0-9*@#]{9}$'),
  valid_from date not null, valid_to date, source_url text not null check(source_url ~ '^https://'),
  primary key(ticker,cusip,valid_from), check(valid_to is null or valid_to >= valid_from)
);
create index on public.ii_identifiers(cusip,valid_from,valid_to);
create table public.ii_corporate_actions (
  ticker text not null references public.ii_securities(ticker), effective_date date not null,
  split_ratio numeric not null check(split_ratio > 0), source_url text not null check(source_url ~ '^https://'), primary key(ticker,effective_date)
);
create table public.ii_filings (
  accession text primary key check(accession ~ '^\d{10}-\d{2}-\d{6}$'), cik text not null references public.ii_institutions(cik),
  form text not null, report_date date, filed_date date not null, source_url text not null check(source_url ~ '^https://www.sec.gov/Archives/edgar/data/'),
  amendment text not null check(amendment in ('original','restatement','additive','unresolved')), amendment_number integer not null default 0,
  status text not null default 'discovered' check(status in ('discovered','parsed','failed')), detected_at timestamptz not null default now(), content_hash text, metadata jsonb not null default '{}'
);
create index on public.ii_filings(cik,report_date,filed_date);
create index on public.ii_filings(status,filed_date);
create table public.ii_holdings (
  accession text not null references public.ii_filings(accession) on delete cascade, cusip text not null,
  issuer text not null, share_class text not null, shares numeric not null check(shares >= 0), share_type text not null,
  put_call text not null default '', value numeric, primary key(accession,cusip,share_class,share_type,put_call)
);
create index on public.ii_holdings(cusip,accession);
create table public.ii_prices (
  ticker text not null references public.ii_securities(ticker), date date not null,
  open numeric not null, high numeric not null, low numeric not null, close numeric not null check(close > 0),
  volume numeric not null check(volume >= 0), adjusted boolean not null default false, source_url text not null,
  fetched_at timestamptz not null default now(), primary key(ticker,date), check(high >= low)
);
create table public.ii_watchlist (user_id uuid not null references public.ii_owner_access(user_id) on delete cascade, ticker text not null references public.ii_securities(ticker), primary key(user_id,ticker));
create table public.ii_scores (fingerprint text primary key, ticker text not null references public.ii_securities(ticker), report_date date not null, score jsonb not null, calculated_at timestamptz not null default now());
create index on public.ii_scores(ticker,report_date);
create table public.ii_alerts (
  dedup_key text primary key, ticker text references public.ii_securities(ticker), cik text, accession text references public.ii_filings(accession), kind text not null,
  report_date date, filed_date date, detected_at timestamptz not null default now(), evidence jsonb not null default '{}', read_at timestamptz
);
create index on public.ii_alerts(detected_at desc);
create table public.ii_settings (id integer primary key check(id=1), weights jsonb not null, alert_threshold numeric not null default 25 check(alert_threshold > 0), volume_threshold numeric not null default 2 check(volume_threshold >= 1));
insert into public.ii_settings values(1,'{"ownership":30,"breadth":20,"significant":15,"technical":15,"relativeStrength":10,"quality":10}',25,2);
create table public.ii_ingestion_logs (id uuid primary key, started_at timestamptz not null default now(), finished_at timestamptz, status text not null, processed integer not null default 0, error text);
create table public.ii_provider_state (id text primary key, next_request timestamptz not null default now(), lease_until timestamptz, lease_owner uuid);
insert into public.ii_provider_state(id) values('sec');

do $$ declare t text; begin
  foreach t in array array['ii_securities','ii_institutions','ii_identifiers','ii_corporate_actions','ii_filings','ii_holdings','ii_prices','ii_watchlist','ii_scores','ii_alerts','ii_settings','ii_ingestion_logs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('create policy ii_owner_read on public.%I for select to authenticated using (public.ii_is_owner())',t);
  end loop;
end $$;
create or replace function public.ii_policy_allows_signals() returns boolean language plpgsql stable security definer set search_path='' as $$
begin return coalesce((public.get_ai_content_policy()->>'buySellSignalsEnabled')::boolean,false);
exception when others then return false;
end $$;
revoke all on function public.ii_policy_allows_signals() from public;
grant execute on function public.ii_policy_allows_signals() to authenticated;
drop policy ii_owner_read on public.ii_scores;
create policy ii_owner_read on public.ii_scores for select to authenticated using(public.ii_is_owner() and public.ii_policy_allows_signals());
alter table public.ii_provider_state enable row level security;
revoke all on public.ii_provider_state from anon, authenticated;
grant all on public.ii_provider_state, public.ii_owner_access to service_role;
-- Only personal preferences are client-writable. Evidence/settings mutations use owner-authorised server endpoints.
grant insert, delete on public.ii_watchlist to authenticated;
create policy ii_watchlist_insert on public.ii_watchlist for insert to authenticated with check(public.ii_is_owner() and user_id = auth.uid());
create policy ii_watchlist_delete on public.ii_watchlist for delete to authenticated using(public.ii_is_owner() and user_id = auth.uid());
grant update(read_at) on public.ii_alerts to authenticated;
create policy ii_alert_read on public.ii_alerts for update to authenticated using(public.ii_is_owner()) with check(public.ii_is_owner());

create or replace function public.ii_claim_ingestion(job_id uuid) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.ii_provider_state set lease_until=now()+interval '5 minutes',lease_owner=job_id
  where id='sec' and (lease_until is null or lease_until < now());
  return found;
end $$;
create or replace function public.ii_release_ingestion(job_id uuid) returns void language sql security definer set search_path = '' as $$
  update public.ii_provider_state set lease_until=null,lease_owner=null where id='sec' and lease_owner=job_id;
$$;
create or replace function public.ii_reserve_sec_request() returns integer language plpgsql security definer set search_path = '' as $$
declare slot timestamptz; begin
  update public.ii_provider_state set next_request=greatest(now(),next_request)+interval '500 milliseconds' where id='sec' returning next_request-interval '500 milliseconds' into slot;
  return greatest(0,ceil(extract(epoch from slot-now())*1000)::integer);
end $$;
create or replace function public.ii_commit_filing(filing jsonb, positions jsonb) returns void language plpgsql security definer set search_path = '' as $$
declare f public.ii_filings; begin
  f := jsonb_populate_record(null::public.ii_filings,filing);
  insert into public.ii_filings select (f).* on conflict(accession) do update set
    report_date=excluded.report_date,amendment=excluded.amendment,amendment_number=excluded.amendment_number,status=excluded.status,content_hash=excluded.content_hash,metadata=excluded.metadata;
  delete from public.ii_holdings where accession=f.accession;
  insert into public.ii_holdings select * from jsonb_populate_recordset(null::public.ii_holdings,positions);
end $$;
revoke all on function public.ii_claim_ingestion(uuid), public.ii_release_ingestion(uuid), public.ii_reserve_sec_request(), public.ii_commit_filing(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ii_claim_ingestion(uuid), public.ii_release_ingestion(uuid), public.ii_reserve_sec_request(), public.ii_commit_filing(jsonb,jsonb) to service_role;

insert into public.ii_securities(ticker) select unnest(array['NVDA','PLTR','ORCL','TSLA','MSFT','GOOGL','SOFI','IOT','BBAI','QUBT','DVLT','HIMS','CMG','OPEN','SPY']);
-- Provision the verified owner's UUID separately using the README. No admin-role bypass.
commit;
