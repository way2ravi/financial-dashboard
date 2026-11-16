-- Read-only permission checks. No account, role, settings or research data is modified.
begin read only;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"2a242050-c61d-43dc-af11-f960ef69f685","role":"authenticated"}', true);
do $$ begin
  if not public.ii_is_owner() then raise exception 'New owner membership check failed'; end if;
  if (select count(*) from public.ii_watchlist where user_id=auth.uid()) <> 14 then
    raise exception 'Expected 14 watched stocks for the new owner';
  end if;
  if not exists(select 1 from public.ai_content_controls where id=1) then
    raise exception 'New owner cannot read admin content settings';
  end if;
end $$;
reset role;

select set_config('request.jwt.claims', json_build_object(
  'sub',(select id from auth.users where lower(email)='way2ravi@gmail.com'),
  'role','authenticated')::text, true);
set local role authenticated;
do $$ begin
  if public.ii_is_owner() then raise exception 'Previous owner retains private access'; end if;
  if exists(select 1 from public.ii_securities) or exists(select 1 from public.ii_filings) then
    raise exception 'Non-owner can read private research data';
  end if;
end $$;
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
do $$
declare settings jsonb; feature text;
begin
  begin
    perform * from public.ii_securities;
    raise exception 'Anonymous private table read unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;
  settings := public.get_ai_content_policy();
  foreach feature in array array['recommendationsEnabled','stockRankingsEnabled',
    'buySellSignalsEnabled','personalisedAdviceEnabled','stopLossRecommendationsEnabled',
    'entryPriceRecommendationsEnabled','takeProfitRecommendationsEnabled'] loop
    if (settings->>feature)::boolean is distinct from false then
      raise exception 'Expected recommendation permission OFF: %',feature;
    end if;
  end loop;
end $$;
reset role;
rollback;
select 'OWNER_AND_NONOWNER_READ_CHECKS_PASSED' as result;
