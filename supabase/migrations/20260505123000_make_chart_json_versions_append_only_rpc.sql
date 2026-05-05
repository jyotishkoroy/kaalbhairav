--
-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.
--
-- Append-only persistence fix: insert a new chart_json_versions row for every calculation and
-- promote current pointers without mutating immutable chart version fields.

begin;

create or replace function public.persist_and_promote_current_chart_version(
  p_user_id uuid,
  p_profile_id uuid,
  p_calculation_id uuid,
  p_chart_json jsonb,
  p_prediction_summary jsonb default null,
  p_input_hash text default null,
  p_settings_hash text default null,
  p_engine_version text default null,
  p_ephemeris_version text default null,
  p_ayanamsha text default null,
  p_house_system text default null,
  p_schema_version text default 'chart_json_v2',
  p_audit_payload jsonb default '{}'::jsonb
)
returns table(chart_version_id uuid, chart_version integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_version integer;
  v_chart_version_id uuid;
  v_engine_version text;
  v_ephemeris_version text;
  v_ayanamsha text;
  v_house_system text;
begin
  if p_user_id is null then raise exception 'p_user_id is required'; end if;
  if p_profile_id is null then raise exception 'p_profile_id is required'; end if;
  if p_chart_json is null then raise exception 'p_chart_json is required'; end if;
  if nullif(trim(coalesce(p_input_hash, '')), '') is null then raise exception 'p_input_hash is required'; end if;
  if nullif(trim(coalesce(p_settings_hash, '')), '') is null then raise exception 'p_settings_hash is required'; end if;
  if coalesce(p_schema_version, '') <> 'chart_json_v2' then
    raise exception 'unsupported schema version: %', p_schema_version;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_profile_id::text));

  perform 1
  from public.birth_profiles
  where id = p_profile_id and user_id = p_user_id;
  if not found then
    raise exception 'birth profile not found for user';
  end if;

  select coalesce(max(chart_version), 0) + 1
  into v_next_version
  from public.chart_json_versions
  where profile_id = p_profile_id;

  update public.chart_json_versions
     set is_current = false
   where profile_id = p_profile_id
     and is_current = true;

  v_engine_version := nullif(trim(coalesce(p_engine_version, p_chart_json #>> '{metadata,engineVersion}', p_chart_json #>> '{metadata,engine_version}', '')), '');
  v_ephemeris_version := nullif(trim(coalesce(p_ephemeris_version, p_chart_json #>> '{metadata,ephemerisVersion}', p_chart_json #>> '{metadata,ephemeris_version}', '')), '');
  v_ayanamsha := nullif(trim(coalesce(p_ayanamsha, p_chart_json #>> '{metadata,ayanamsha}', 'lahiri')), '');
  v_house_system := nullif(trim(coalesce(p_house_system, p_chart_json #>> '{metadata,houseSystem}', p_chart_json #>> '{metadata,house_system}', 'whole_sign')), '');

  if v_engine_version is null then raise exception 'missing_chart_metadata:engine_version'; end if;
  if v_ephemeris_version is null then raise exception 'missing_chart_metadata:ephemeris_version'; end if;
  if v_ayanamsha is null then raise exception 'missing_chart_metadata:ayanamsha'; end if;
  if v_house_system is null then raise exception 'missing_chart_metadata:house_system'; end if;

  insert into public.chart_json_versions (
    user_id,
    profile_id,
    calculation_id,
    chart_json,
    prediction_summary,
    input_hash,
    settings_hash,
    engine_version,
    ephemeris_version,
    ayanamsha,
    house_system,
    schema_version,
    chart_version,
    status,
    is_current
  )
  values (
    p_user_id,
    p_profile_id,
    p_calculation_id,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                p_chart_json,
                '{metadata,chartVersion}',
                to_jsonb(v_next_version),
                true
              ),
              '{metadata,engineVersion}',
              to_jsonb(v_engine_version),
              true
            ),
            '{metadata,ephemerisVersion}',
            to_jsonb(v_ephemeris_version),
            true
          ),
          '{metadata,ayanamsha}',
          to_jsonb(v_ayanamsha),
          true
        ),
        '{metadata,houseSystem}',
        to_jsonb(v_house_system),
        true
      ),
      '{metadata,profileId}',
      to_jsonb(p_profile_id::text),
      true
    ),
    p_prediction_summary,
    p_input_hash,
    p_settings_hash,
    v_engine_version,
    v_ephemeris_version,
    v_ayanamsha,
    v_house_system,
    p_schema_version,
    v_next_version,
    'completed',
    true
  )
  returning id into v_chart_version_id;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'birth_profiles' and column_name = 'current_chart_version_id'
  ) then
    execute 'update public.birth_profiles set current_chart_version_id = $1 where id = $2 and user_id = $3'
      using v_chart_version_id, p_profile_id, p_user_id;
  end if;

  if p_calculation_id is not null and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'chart_calculations' and column_name = 'current_chart_version_id'
  ) then
    execute '
      update public.chart_calculations
         set current_chart_version_id = $1,
             status = ''completed'',
             completed_at = coalesce(completed_at, now())
       where id = $2 and user_id = $3 and profile_id = $4'
    using v_chart_version_id, p_calculation_id, p_user_id, p_profile_id;
  elsif p_calculation_id is not null then
    execute '
      update public.chart_calculations
         set status = ''completed'',
             completed_at = coalesce(completed_at, now())
       where id = $1 and user_id = $2 and profile_id = $3'
    using p_calculation_id, p_user_id, p_profile_id;
  end if;

  insert into public.prediction_ready_summaries (
    user_id,
    profile_id,
    chart_version_id,
    topic,
    prediction_context_version,
    prediction_context,
    created_at
  )
  values (
    p_user_id,
    p_profile_id,
    v_chart_version_id,
    'general',
    '1.0.0',
    coalesce(p_prediction_summary, '{}'::jsonb),
    now()
  )
  on conflict (chart_version_id, topic, prediction_context_version)
  do update set
    user_id = excluded.user_id,
    profile_id = excluded.profile_id,
    prediction_context = excluded.prediction_context;

  insert into public.calculation_audit_logs (
    user_id,
    profile_id,
    calculation_id,
    chart_version_id,
    event,
    detail
  )
  values (
    p_user_id,
    p_profile_id,
    p_calculation_id,
    v_chart_version_id,
    'current_chart_persisted_atomically',
    coalesce(p_audit_payload, '{}'::jsonb) || jsonb_build_object(
      'chart_version_id', v_chart_version_id,
      'chart_version', v_next_version,
      'schema_version', p_schema_version
    )
  );

  return query select v_chart_version_id, v_next_version;
end;
$$;

grant execute on function public.persist_and_promote_current_chart_version(
  uuid,
  uuid,
  uuid,
  jsonb,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to service_role;

revoke all on function public.persist_and_promote_current_chart_version(
  uuid,
  uuid,
  uuid,
  jsonb,
  jsonb,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public;

notify pgrst, 'reload schema';

commit;
