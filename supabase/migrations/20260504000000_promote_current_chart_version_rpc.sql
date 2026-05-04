-- Copyright (c) 2026 Jyotishko Roy.
-- Proprietary and confidential. All rights reserved.
-- Project: tarayai — https://tarayai.com

-- Phase 1 fix: atomic current-chart promotion RPC + unique-current enforcement

begin;

-- Allow updating is_current on chart_json_versions (was fully immutable).
-- The chart JSON itself stays immutable; only the is_current flag may change.
create or replace function public.prevent_immutable_update_chart_versions()
returns trigger
language plpgsql
as $$
begin
  if old.chart_json is distinct from new.chart_json
    or old.user_id is distinct from new.user_id
    or old.profile_id is distinct from new.profile_id
    or old.calculation_id is distinct from new.calculation_id
    or old.chart_version is distinct from new.chart_version
    or old.input_hash is distinct from new.input_hash
    or old.settings_hash is distinct from new.settings_hash
    or old.engine_version is distinct from new.engine_version
    or old.schema_version is distinct from new.schema_version
  then
    raise exception 'immutable chart_json_versions fields cannot be modified; only is_current and status may be updated';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chart_json_versions_immutable_update on public.chart_json_versions;
create trigger trg_chart_json_versions_immutable_update
  before update on public.chart_json_versions
  for each row execute function public.prevent_immutable_update_chart_versions();

-- Unique index: at most one is_current=true completed chart per profile.
create unique index if not exists ux_chart_json_versions_one_current_per_profile
  on public.chart_json_versions(profile_id)
  where is_current = true and status = 'completed';

-- Atomic RPC: promote a newly-inserted chart version as the current chart.
-- Must be called after the chart row is already inserted (by the application).
-- Parameters:
--   p_user_id       — authenticated user id
--   p_profile_id    — birth profile id (must belong to user)
--   p_calc_id       — chart_calculations.id (must belong to same user/profile)
--   p_chart_version_id — chart_json_versions.id to promote (must belong to same user/profile)
--   p_input_hash    — input hash to store on birth_profiles
create or replace function public.promote_current_chart_version(
  p_user_id          uuid,
  p_profile_id       uuid,
  p_calc_id          uuid,
  p_chart_version_id uuid,
  p_input_hash       text default null
)
returns table(chart_version_id uuid, chart_version integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chart_version integer;
  v_profile_user_id uuid;
  v_calc_user_id uuid;
  v_calc_profile_id uuid;
  v_chart_user_id uuid;
  v_chart_profile_id uuid;
begin
  -- Lock profile row for the duration of the transaction.
  select user_id into v_profile_user_id
    from birth_profiles
   where id = p_profile_id
     for update;

  if v_profile_user_id is null then
    raise exception 'profile_not_found: %', p_profile_id;
  end if;
  if v_profile_user_id <> p_user_id then
    raise exception 'profile_access_denied: profile does not belong to user';
  end if;

  -- Verify calculation belongs to same user/profile.
  select user_id, profile_id into v_calc_user_id, v_calc_profile_id
    from chart_calculations
   where id = p_calc_id;

  if v_calc_user_id is null then
    raise exception 'calculation_not_found: %', p_calc_id;
  end if;
  if v_calc_user_id <> p_user_id or v_calc_profile_id <> p_profile_id then
    raise exception 'calculation_access_denied: calculation does not belong to user/profile';
  end if;

  -- Verify chart version belongs to same user/profile and is completed.
  select user_id, profile_id, chart_version into v_chart_user_id, v_chart_profile_id, v_chart_version
    from chart_json_versions
   where id = p_chart_version_id;

  if v_chart_user_id is null then
    raise exception 'chart_version_not_found: %', p_chart_version_id;
  end if;
  if v_chart_user_id <> p_user_id or v_chart_profile_id <> p_profile_id then
    raise exception 'chart_version_access_denied: chart does not belong to user/profile';
  end if;

  -- Mark all older completed chart rows for this profile as non-current.
  update chart_json_versions
     set is_current = false
   where profile_id = p_profile_id
     and is_current = true
     and id <> p_chart_version_id;

  -- Mark the new chart as current and completed.
  update chart_json_versions
     set is_current = true,
         status = 'completed'
   where id = p_chart_version_id
     and profile_id = p_profile_id;

  -- Update calculation: mark completed and link to chart version.
  update chart_calculations
     set status = 'completed',
         current_chart_version_id = p_chart_version_id,
         completed_at = coalesce(completed_at, now())
   where id = p_calc_id
     and profile_id = p_profile_id;

  -- Update birth_profiles: point to the new current chart.
  update birth_profiles
     set current_chart_version_id = p_chart_version_id,
         input_hash = coalesce(p_input_hash, input_hash)
   where id = p_profile_id
     and user_id = p_user_id;

  return query select p_chart_version_id, v_chart_version;
end;
$$;

-- Grant execute to the service role used by the backend (anon + authenticated will never call this).
-- The function is security definer so it runs as the defining role regardless.
revoke all on function public.promote_current_chart_version(uuid,uuid,uuid,uuid,text) from public;
grant execute on function public.promote_current_chart_version(uuid,uuid,uuid,uuid,text) to service_role;

commit;
