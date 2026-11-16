-- Run ONLY after BOTH feature SQL files have succeeded.
-- Run as the trusted database administrator in Supabase SQL Editor.
-- This grants admin/private-owner access ONLY to the verified email below.
-- If the previous owner was already provisioned, use 05-transfer-private-owner.sql instead.
begin;
do $$
declare owner_id uuid;
begin
  if to_regclass('public.ai_content_controls') is null
     or to_regclass('public.ii_owner_access') is null
     or to_regclass('public.ii_securities') is null then
    raise exception 'Stop: complete both feature database setup steps first.';
  end if;

  select id into strict owner_id
  from auth.users
  where lower(email) = 'way2investing9@gmail.com'
    and email_confirmed_at is not null;

  if exists(select 1 from public.ii_owner_access where user_id <> owner_id) then
    raise exception 'Stop: another private owner is already configured. Review before granting access.';
  end if;

  insert into public.users_profile(id, role)
  values(owner_id, 'admin')
  on conflict(id) do update set role = 'admin', updated_at = now();

  insert into public.ii_owner_access(user_id)
  values(owner_id) on conflict do nothing;

  insert into public.ii_watchlist(user_id,ticker)
  select owner_id,ticker from public.ii_securities
  where ticker = any(array['NVDA','PLTR','ORCL','TSLA','MSFT','GOOGL','SOFI','IOT','BBAI','QUBT','DVLT','HIMS','CMG','OPEN'])
  on conflict do nothing;
end $$;
commit;

-- Expected: one row; admin; true; 14 default stocks.
select u.id as owner_user_id, u.email, p.role,
       exists(select 1 from public.ii_owner_access a where a.user_id = u.id) as private_access_enabled,
       (select count(*) from public.ii_watchlist w where w.user_id = u.id
         and w.ticker = any(array['NVDA','PLTR','ORCL','TSLA','MSFT','GOOGL','SOFI','IOT','BBAI','QUBT','DVLT','HIMS','CMG','OPEN'])) as default_stocks
from auth.users u
join public.users_profile p on p.id = u.id
where lower(u.email) = 'way2investing9@gmail.com';

-- Recommendation permissions should remain false; informational features true.
select public.get_ai_content_policy() as effective_content_settings;
