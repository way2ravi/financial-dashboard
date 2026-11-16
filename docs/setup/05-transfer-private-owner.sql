-- Run in Supabase SQL Editor as the trusted database administrator / postgres.
-- Transfers private research access to the confirmed, explicitly selected account.
-- Does NOT delete either auth user, remove existing admin roles, enable recommendations,
-- or enable scheduled jobs. Grants the new owner admin access for /admin/settings.
begin;
lock table public.ii_owner_access in share row exclusive mode;
lock table public.ii_watchlist in share row exclusive mode;

do $$
declare
  new_owner uuid;
  previous_owner uuid;
begin
  select id into strict new_owner
  from auth.users
  where id = '2a242050-c61d-43dc-af11-f960ef69f685'::uuid
    and lower(email) = 'way2investing9@gmail.com'
    and email_confirmed_at is not null;

  select id into previous_owner
  from auth.users where lower(email) = 'way2ravi@gmail.com';

  if exists (
    select 1 from public.ii_owner_access
    where user_id <> new_owner and user_id is distinct from previous_owner
  ) then
    raise exception 'Stop: unexpected existing private owner. No access changes were applied.';
  end if;

  insert into public.users_profile(id, role) values(new_owner, 'admin')
  on conflict(id) do update set role = 'admin', updated_at = now();

  insert into public.ii_owner_access(user_id) values(new_owner)
  on conflict do nothing;

  if previous_owner is not null and previous_owner <> new_owner then
    insert into public.ii_watchlist(user_id,ticker)
    select new_owner,ticker from public.ii_watchlist where user_id = previous_owner
    on conflict do nothing;

    -- The old owner grant cascades only its old watchlist rows, after copying above.
    delete from public.ii_owner_access where user_id = previous_owner;
  end if;

  if (select count(*) from public.ii_owner_access) <> 1 then
    raise exception 'Stop: private-owner verification failed. Transaction rolled back.';
  end if;
end $$;
commit;

-- Expected: one row with the new email, admin, true, and the transferred stock count.
select u.id as owner_user_id, u.email, p.role,
       exists(select 1 from public.ii_owner_access a where a.user_id=u.id) as private_access_enabled,
       (select count(*) from public.ii_watchlist w where w.user_id=u.id) as watched_stocks,
       not exists (
         select 1 from public.ii_owner_access a join auth.users old_user on old_user.id=a.user_id
         where lower(old_user.email)='way2ravi@gmail.com'
       ) as previous_private_access_removed
from auth.users u
join public.users_profile p on p.id=u.id
where u.id='2a242050-c61d-43dc-af11-f960ef69f685'::uuid
  and lower(u.email)='way2investing9@gmail.com';
