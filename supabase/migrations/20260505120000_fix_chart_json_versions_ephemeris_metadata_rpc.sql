--
-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.
--
-- Phase 21 forward fix: persist canonical chart metadata with explicit ephemeris_version handling.

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
  v_profile_user_id uuid;
  v_calculation_user_id uuid;
  v_calculation_profile_id uuid;
  v_next_version integer;
  v_chart_version_id uuid;
  v_chart_json jsonb;
  v_engine_version text;
  v_ephemeris_version text;
  v_ayanamsha text;
  v_house_system text;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_profile_id is null then
    raise exception 'p_profile_id is required';
  end if;

  if p_chart_json is null then
    raise exception 'p_chart_json is required';
  end if;

  if coalesce(p_schema_version, '') <> 'chart_json_v2' then
    raise exception 'unsupported schema version: %', p_schema_version;
  end if;

  perform 1
  from public.birth_profiles
  where id = p_profile_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'birth profile not found for user';
  end if;

  if p_calculation_id is not null then
    select user_id, profile_id
    into v_calculation_user_id, v_calculation_profile_id
    from public.chart_calculations
    where id = p_calculation_id
    for update;

    if not found then
      raise exception 'calculation not found for user/profile';
    end if;

    if v_calculation_user_id <> p_user_id or v_calculation_profile_id <> p_profile_id then
      raise exception 'calculation not found for user/profile';
    end if;
  end if;

  select coalesce(max(cjv.chart_version), 0) + 1
  into v_next_version
  from public.chart_json_versions cjv
  where cjv.profile_id = p_profile_id;

  v_engine_version := nullif(trim(coalesce(p_engine_version, p_chart_json #>> '{metadata,engineVersion}', p_chart_json #>> '{metadata,engine_version}', '')), '');
  v_ephemeris_version := nullif(trim(coalesce(p_ephemeris_version, p_chart_json #>> '{metadata,ephemerisVersion}', p_chart_json #>> '{metadata,ephemeris_version}', '')), '');
  v_ayanamsha := nullif(trim(coalesce(p_ayanamsha, p_chart_json #>> '{metadata,ayanamsha}', 'lahiri')), '');
  v_house_system := nullif(trim(coalesce(p_house_system, p_chart_json #>> '{metadata,houseSystem}', p_chart_json #>> '{metadata,house_system}', 'whole_sign')), '');

  if v_engine_version is null then
    raise exception 'missing_chart_metadata:engine_version';
  end if;

  if v_ephemeris_version is null then
    raise exception 'missing_chart_metadata:ephemeris_version';
  end if;

  if v_ayanamsha is null then
    raise exception 'missing_chart_metadata:ayanamsha';
  end if;

  if v_house_system is null then
    raise exception 'missing_chart_metadata:house_system';
  end if;

  insert into public.chart_json_versions (
    user_id,
    profile_id,
    calculation_id,
    chart_version,
    chart_json,
    schema_version,
    status,
    is_current,
    input_hash,
    settings_hash,
    engine_version,
    ephemeris_version,
    created_at
  )
  values (
    p_user_id,
    p_profile_id,
    p_calculation_id,
    v_next_version,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            p_chart_json,
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
    p_schema_version,
    'pending',
    false,
    p_input_hash,
    p_settings_hash,
    v_engine_version,
    v_ephemeris_version,
    now()
  )
  returning id into v_chart_version_id;

  update public.chart_json_versions
  set chart_json = jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              chart_json,
              '{metadata,chartVersionId}',
              to_jsonb(v_chart_version_id::text),
              true
            ),
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
      status = 'completed',
      is_current = true
  where id = v_chart_version_id;

  update public.chart_json_versions
  set is_current = false
  where profile_id = p_profile_id
    and is_current = true
    and id <> v_chart_version_id;

  if p_prediction_summary is not null then
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
      p_prediction_summary,
      now()
    )
    on conflict (chart_version_id, topic, prediction_context_version)
    do update set
      user_id = excluded.user_id,
      profile_id = excluded.profile_id,
      prediction_context = excluded.prediction_context;
  end if;

  update public.chart_calculations
  set current_chart_version_id = v_chart_version_id,
      status = 'completed',
      completed_at = coalesce(completed_at, now())
  where id = p_calculation_id
    and user_id = p_user_id
    and profile_id = p_profile_id;

  update public.birth_profiles
  set current_chart_version_id = v_chart_version_id
  where id = p_profile_id
    and user_id = p_user_id;

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
  jsonb
) from public;

commit;
