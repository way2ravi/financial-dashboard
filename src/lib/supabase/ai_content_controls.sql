-- Apply after schema.sql and rls.sql. All public environments start information-only.
begin;

-- Self-editable profiles must never confer administrator privileges.
create or replace function public.protect_profile_role() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if (TG_OP = 'INSERT' and new.role <> 'user') or
       (TG_OP = 'UPDATE' and new.role is distinct from old.role) then
      raise exception 'Profile role changes require trusted database administration' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_role on public.users_profile;
create trigger protect_profile_role before insert or update on public.users_profile
for each row execute function public.protect_profile_role();

create table if not exists public.ai_content_controls (
  id integer primary key check (id = 1),
  settings jsonb not null,
  approval jsonb,
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
create table if not exists public.ai_content_audit (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_identity text not null,
  changed_at timestamptz not null default now(),
  old_value jsonb not null,
  new_value jsonb not null
);
alter table public.ai_content_audit alter column actor_id drop not null;
alter table public.ai_content_audit add column if not exists actor_identity text not null default 'database administration';
insert into public.ai_content_controls(id, settings) values (1, '{
  "recommendationsEnabled":false,"buySellSignalsEnabled":false,
  "stopLossRecommendationsEnabled":false,"takeProfitRecommendationsEnabled":false,
  "entryPriceRecommendationsEnabled":false,"stockRankingsEnabled":false,
  "personalisedAdviceEnabled":false,"informationalAnalysisEnabled":true,"financialNewsEnabled":true
}') on conflict (id) do nothing;

alter table public.ai_content_controls enable row level security;
alter table public.ai_content_audit enable row level security;
revoke all on public.ai_content_controls, public.ai_content_audit from anon, authenticated;
grant select on public.ai_content_controls, public.ai_content_audit to authenticated;
drop policy if exists admin_read_controls on public.ai_content_controls;
create policy admin_read_controls on public.ai_content_controls for select to authenticated
using (exists (select 1 from public.users_profile where id = auth.uid() and role = 'admin'));
drop policy if exists admin_read_content_audit on public.ai_content_audit;
create policy admin_read_content_audit on public.ai_content_audit for select to authenticated
using (exists (select 1 from public.users_profile where id = auth.uid() and role = 'admin'));

create or replace function public.audit_ai_content_controls() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.ai_content_audit(actor_id, actor_identity, old_value, new_value)
  values (auth.uid(), coalesce(auth.uid()::text, session_user), to_jsonb(old), coalesce(to_jsonb(new), '{}'::jsonb));
  return null;
end;
$$;
revoke all on function public.audit_ai_content_controls() from public;
drop trigger if exists audit_ai_content_controls on public.ai_content_controls;
create trigger audit_ai_content_controls after update or delete on public.ai_content_controls
for each row execute function public.audit_ai_content_controls();

create or replace function public.get_ai_content_policy() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.ai_content_controls; result jsonb; feature text; approved boolean := false;
begin
  select * into strict c from public.ai_content_controls where id = 1;
  result := c.settings;
  if c.approval->>'status' = 'approved' then
    approved := jsonb_typeof(c.approval->'approvedFeatures') = 'array'
      and length(trim(c.approval->>'approverIdentity')) > 0
      and length(trim(c.approval->>'jurisdiction')) > 0
      and length(trim(c.approval->>'evidence')) > 0
      and isfinite((c.approval->>'approvedAt')::timestamptz)
      and isfinite((c.approval->>'expiresAt')::timestamptz)
      and (c.approval->>'approvedAt')::timestamptz <= now()
      and (c.approval->>'expiresAt')::timestamptz > now();
  end if;
  foreach feature in array array['buySellSignalsEnabled','stopLossRecommendationsEnabled',
    'takeProfitRecommendationsEnabled','entryPriceRecommendationsEnabled','stockRankingsEnabled','personalisedAdviceEnabled'] loop
    result := jsonb_set(result, array[feature], to_jsonb(coalesce(
      (c.settings->>'recommendationsEnabled')::boolean and approved
      and (c.settings->>feature)::boolean and (c.approval->'approvedFeatures' ? feature), false)));
  end loop;
  result := jsonb_set(result, '{recommendationsEnabled}', to_jsonb(exists (
    select 1 from jsonb_each(result) x where x.key not in
      ('recommendationsEnabled','informationalAnalysisEnabled','financialNewsEnabled') and x.value = 'true'::jsonb)));
  return result;
exception when others then
  -- Deliberately return no permissions if configuration or approval is malformed.
  return null;
end;
$$;
revoke all on function public.get_ai_content_policy() from public;
grant execute on function public.get_ai_content_policy() to anon, authenticated, service_role;

create or replace function public.save_ai_content_controls(new_settings jsonb, new_approval jsonb, expected_revision integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare previous public.ai_content_controls; key text; next_revision integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.users_profile where id = auth.uid() and role = 'admin'
  ) then raise exception 'Administrator access required' using errcode = '42501'; end if;
  select * into strict previous from public.ai_content_controls where id = 1 for update;
  if previous.revision is distinct from expected_revision then raise exception 'Settings changed. Reload before saving.'; end if;
  if jsonb_typeof(new_settings) <> 'object' or
     (select count(*) from jsonb_object_keys(new_settings)) <> 9 then
    raise exception 'Invalid settings';
  end if;
  foreach key in array array['recommendationsEnabled','buySellSignalsEnabled','stopLossRecommendationsEnabled',
    'takeProfitRecommendationsEnabled','entryPriceRecommendationsEnabled','stockRankingsEnabled',
    'personalisedAdviceEnabled','informationalAnalysisEnabled','financialNewsEnabled'] loop
    if jsonb_typeof(new_settings->key) is distinct from 'boolean' then raise exception 'Invalid setting %', key; end if;
  end loop;
  if new_approval is not null and new_approval <> 'null'::jsonb then
    if jsonb_typeof(new_approval) <> 'object' or coalesce(new_approval->>'status','') not in ('pending','approved','rejected') then
      raise exception 'Invalid compliance review';
    end if;
    if new_approval->>'status' = 'approved' and (
      coalesce(length(trim(new_approval->>'approverIdentity')),0) = 0 or
      coalesce(length(trim(new_approval->>'jurisdiction')),0) = 0 or
      coalesce(length(trim(new_approval->>'evidence')),0) = 0 or
      coalesce(jsonb_typeof(new_approval->'approvedFeatures'),'') <> 'array' or
      not coalesce(isfinite((new_approval->>'approvedAt')::timestamptz), false) or
      not coalesce(isfinite((new_approval->>'expiresAt')::timestamptz), false) or
      coalesce((new_approval->>'approvedAt')::timestamptz > now(), true) or
      coalesce((new_approval->>'expiresAt')::timestamptz <= now(), true)
    ) then raise exception 'Complete, current regulatory approval evidence is required'; end if;
  end if;
  next_revision := previous.revision + 1;
  update public.ai_content_controls set settings = new_settings, approval = new_approval,
    revision = next_revision, updated_at = now() where id = 1;
  return next_revision;
end;
$$;
revoke all on function public.save_ai_content_controls(jsonb,jsonb,integer) from public;
grant execute on function public.save_ai_content_controls(jsonb,jsonb,integer) to authenticated;

-- Close the direct PostgREST path as well as application/API render paths.
drop policy if exists "Public can read analyst ratings" on public.analyst_ratings_snapshot;
create policy "Public can read analyst ratings" on public.analyst_ratings_snapshot
for select to anon, authenticated using (
  coalesce((public.get_ai_content_policy()->>'buySellSignalsEnabled')::boolean, false)
);
drop policy if exists "Public can read company news" on public.company_news;
create policy "Public can read company news" on public.company_news
for select to anon, authenticated using (
  coalesce((public.get_ai_content_policy()->>'financialNewsEnabled')::boolean, true)
  and (headline || ' ' || coalesce(summary,'') || ' ' || coalesce(source_name,'') || ' ' || coalesce(sentiment_label,'')) !~* '\m(buy|sell|hold|accumulate|dump|purchase|short this|go long|go short|stop[ -]?loss|take[ -]?profit|price targets?|recommend\w*|best stocks?|entry point|entry price|trading strateg\w*|profit.taking|you should|good default|best default)\M'
);
commit;
