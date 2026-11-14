-- Run with psql against a DISPOSABLE/STAGING Supabase database after the migration.
-- Requires one trusted admin profile and one ordinary user profile.
-- Everything below is rolled back, including audit writes.
\set ON_ERROR_STOP on
begin;
create temporary table content_test_identities as
select (select id from public.users_profile where role = 'admin' limit 1) admin_id,
       (select id from public.users_profile where role = 'user' limit 1) user_id;
grant select on content_test_identities to authenticated;
do $$ begin
  if exists (select 1 from content_test_identities where admin_id is null or user_id is null) then
    raise exception 'Create trusted admin and regular-user fixtures first';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',user_id,'role','authenticated')::text, true)
from content_test_identities;
do $$ begin
  if exists (select 1 from public.ai_content_controls) then raise exception 'Regular user read settings'; end if;
  begin
    perform public.save_ai_content_controls('{}', null, 1);
    raise exception 'Regular user saved settings';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.users_profile set role = 'admin' where id = auth.uid();
    raise exception 'Self-promotion succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claims', json_build_object('sub',admin_id,'role','authenticated')::text, true)
from content_test_identities;
do $$
declare c public.ai_content_controls; all_on jsonb; approval jsonb; rev integer; count_before bigint;
begin
  select * into strict c from public.ai_content_controls where id = 1;
  select count(*) into count_before from public.ai_content_audit;
  select jsonb_object_agg(key, true) into all_on from jsonb_object_keys(c.settings) key;
  rev := public.save_ai_content_controls(all_on, null, c.revision);
  if (public.get_ai_content_policy()->>'buySellSignalsEnabled')::boolean then
    raise exception 'Switch activated without approval';
  end if;
  approval := jsonb_build_object('status','approved','approvedAt',now() - interval '1 day',
    'expiresAt',now() + interval '1 day','approverIdentity','Integration test reviewer',
    'jurisdiction','Test only','evidence','Test only',
    'approvedFeatures',jsonb_build_array('buySellSignalsEnabled'));
  rev := public.save_ai_content_controls(all_on, approval, rev);
  if not (public.get_ai_content_policy()->>'buySellSignalsEnabled')::boolean then raise exception 'Approved feature not active'; end if;
  if (public.get_ai_content_policy()->>'stopLossRecommendationsEnabled')::boolean then raise exception 'Unapproved feature active'; end if;
  rev := public.save_ai_content_controls(jsonb_set(all_on,'{recommendationsEnabled}','false'), approval, rev);
  if (public.get_ai_content_policy()->>'recommendationsEnabled')::boolean then raise exception 'Master did not override'; end if;
  begin
    perform public.save_ai_content_controls(all_on, approval, c.revision);
    raise exception 'Stale revision accepted';
  exception when raise_exception then
    if SQLERRM <> 'Settings changed. Reload before saving.' then raise; end if;
  end;
  if (select count(*) from public.ai_content_audit) <> count_before + 3 then raise exception 'Audit writes missing'; end if;
  if exists (select 1 from (select actor_id from public.ai_content_audit order by id desc limit 3) recent where actor_id <> auth.uid()) then raise exception 'Incorrect actor'; end if;
  begin
    update public.ai_content_controls set revision = revision + 1;
    raise exception 'Direct settings write allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
-- Simulate an approval expiring after it was recorded, without changing app code.
update public.ai_content_controls set
  settings = jsonb_set(settings, '{recommendationsEnabled}', 'true'),
  approval = jsonb_set(approval, '{expiresAt}', to_jsonb((now() - interval '1 second')::text));
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  if (public.get_ai_content_policy()->>'recommendationsEnabled')::boolean then raise exception 'Expired approval active'; end if;
  if exists (select 1 from public.analyst_ratings_snapshot) then raise exception 'Disabled ratings exposed through direct database API'; end if;
  begin
    perform public.save_ai_content_controls('{}', null, 1);
    raise exception 'Anonymous write allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
