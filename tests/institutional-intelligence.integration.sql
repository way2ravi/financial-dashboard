-- Run only in staging, after migration and verified owner provisioning.
-- Requires one ordinary non-owner auth.users fixture. All writes roll back.
\set ON_ERROR_STOP on
begin;
create temporary table ii_test_users as select
 (select user_id from public.ii_owner_access limit 1) owner_id,
 (select id from auth.users where id not in (select user_id from public.ii_owner_access) limit 1) other_id;
grant select on ii_test_users to authenticated;
do $$ begin if exists(select 1 from ii_test_users where owner_id is null or other_id is null) then raise exception 'Provision owner and non-owner fixtures'; end if; end $$;
set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',other_id,'role','authenticated')::text,true) from ii_test_users;
do $$ begin
 if public.ii_is_owner() then raise exception 'Non-owner recognised as owner'; end if;
 if exists(select 1 from public.ii_securities) then raise exception 'Non-owner read private data'; end if;
 begin insert into public.ii_owner_access(user_id) values(auth.uid()); raise exception 'Self-granted ownership'; exception when insufficient_privilege then null; end;
 begin perform public.ii_claim_ingestion(gen_random_uuid()); raise exception 'Non-owner started worker'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',owner_id,'role','authenticated')::text,true) from ii_test_users;
do $$ begin
 if not public.ii_is_owner() then raise exception 'Owner not recognised'; end if;
 if not exists(select 1 from public.ii_securities where ticker='NVDA') then raise exception 'Owner cannot read research'; end if;
 begin update public.ii_securities set name='Unauthorized direct mutation' where ticker='NVDA'; raise exception 'Owner client mutated evidence'; exception when insufficient_privilege then null; end;
 insert into public.ii_watchlist(user_id,ticker) values(auth.uid(),'SPY') on conflict do nothing;
 delete from public.ii_watchlist where user_id=auth.uid() and ticker='SPY';
 begin insert into public.ii_watchlist(user_id,ticker) select other_id,'SPY' from ii_test_users; raise exception 'Cross-owner watchlist write'; exception when insufficient_privilege then null; end;
 if not public.ii_policy_allows_signals() and exists(select 1 from public.ii_scores) then raise exception 'Disabled scores exposed'; end if;
end $$;
reset role;
set local role service_role;
do $$ declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); begin
 if not public.ii_claim_ingestion(a) then raise exception 'First worker cannot acquire lease'; end if;
 if public.ii_claim_ingestion(b) then raise exception 'Concurrent worker acquired lease'; end if;
 perform public.ii_release_ingestion(b);
 if public.ii_claim_ingestion(b) then raise exception 'Wrong worker released lease'; end if;
 perform public.ii_release_ingestion(a);
 if not public.ii_claim_ingestion(b) then raise exception 'Lease did not release'; end if;
 perform public.ii_release_ingestion(b);
 if public.ii_reserve_sec_request()<0 then raise exception 'Invalid SEC slot'; end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 begin perform * from public.ii_filings; raise exception 'Anonymous data read'; exception when insufficient_privilege then null; end;
 begin perform public.ii_commit_filing('{}','[]'); raise exception 'Anonymous filing write'; exception when insufficient_privilege then null; end;
end $$;
rollback;
