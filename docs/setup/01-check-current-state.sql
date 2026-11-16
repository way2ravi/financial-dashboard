-- READ ONLY. Run in Supabase SQL Editor for the existing Way2Investing project.
select id as owner_user_id, email,
       email_confirmed_at is not null as email_is_confirmed
from auth.users
where lower(email) = 'way2investing9@gmail.com';

-- NULL means that setup step has not been applied.
select to_regclass('public.ai_content_controls') as recommendations_settings,
       to_regclass('public.ii_owner_access') as private_owner_table,
       to_regclass('public.ii_securities') as private_stock_table;
