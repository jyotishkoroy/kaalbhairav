-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.
--
-- Forward-fix for atomic chart persistence ambiguity issues.

begin;

drop index if exists public.ux_chart_json_versions_one_current_per_profile;

with ranked_current_charts as (
  select
    cjv.id,
    row_number() over (
      partition by cjv.profile_id
      order by cjv.created_at desc, cjv.chart_version desc, cjv.id desc
    ) as rn
  from public.chart_json_versions cjv
  where cjv.status = 'completed'
    and cjv.is_current = true
)
update public.chart_json_versions cjv
set
  is_current = false,
  updated_at = now()
from ranked_current_charts ranked
where cjv.id = ranked.id
  and ranked.rn > 1;

create unique index if not exists ux_chart_json_versions_one_current_completed_per_profile
on public.chart_json_versions(profile_id)
where status = 'completed'
  and is_current = true;

create or replace function public.persist_and_promote_current_chart_version(
  p_user_id uuid,
  p_profile_id uuid,
  p_calculation_id uuid,
  p_chart_json jsonb,
  p_prediction_summary jsonb,
  p_input_hash text,
  p_settings_hash text,
  p_engine_version text,
  p_schema_version text default 'v1',
  p_audit_payload jsonb default '{}'::jsonb
)
returns table (
  chart_version_id uuid,
  chart_version integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chart_version_id uuid;
  v_chart_version integer;
begin
  if p_user_id is null then
    raise exception 'p_user_id_required';
  end if;

  if p_profile_id is null then
    raise exception 'p_profile_id_required';
  end if;

  if p_calculation_id is null then
    raise exception 'p_calculation_id_required';
  end if;

  if p_chart_json is null then
    raise exception 'p_chart_json_required';
  end if;

  if nullif(trim(p_input_hash), '') is null then
    raise exception 'p_input_hash_required';
  end if;

  if nullif(trim(p_settings_hash), '') is null then
    raise exception 'p_settings_hash_required';
  end if;

  if nullif(trim(p_engine_version), '') is null then
    raise exception 'p_engine_version_required';
  end if;

  if not exists (
    select 1
    from public.birth_profiles bp
    where bp.id = p_profile_id
      and bp.user_id = p_user_id
      and bp.status = 'active'
  ) then
    raise exception 'birth_profile_not_found_or_not_active';
  end if;

  if not exists (
    select 1
    from public.chart_calculations cc
    where cc.id = p_calculation_id
      and cc.user_id = p_user_id
      and cc.profile_id = p_profile_id
  ) then
    raise exception 'chart_calculation_not_found';
  end if;

  perform 1
  from public.birth_profiles bp
  where bp.id = p_profile_id
    and bp.user_id = p_user_id
  for update;

  select coalesce(max(cjv.chart_version), 0) + 1
  into v_chart_version
  from public.chart_json_versions cjv
  where cjv.profile_id = p_profile_id;

  insert into public.chart_json_versions (
    user_id,
    profile_id,
    calculation_id,
    chart_json,
    input_hash,
    settings_hash,
    engine_version,
    schema_version,
    chart_version,
    status,
    is_current,
    computed_at
  )
  values (
    p_user_id,
    p_profile_id,
    p_calculation_id,
    p_chart_json,
    p_input_hash,
    p_settings_hash,
    p_engine_version,
    coalesce(nullif(trim(p_schema_version), ''), 'v1'),
    v_chart_version,
    'completed',
    false,
    now()
  )
  returning chart_json_versions.id
  into v_chart_version_id;

  if p_prediction_summary is not null
     and jsonb_typeof(p_prediction_summary) = 'object'
     and p_prediction_summary <> '{}'::jsonb then
    insert into public.prediction_ready_summaries (
      user_id,
      profile_id,
      chart_version_id,
      summary_json,
      input_hash,
      settings_hash,
      engine_version,
      schema_version
    )
    values (
      p_user_id,
      p_profile_id,
      v_chart_version_id,
      p_prediction_summary,
      p_input_hash,
      p_settings_hash,
      p_engine_version,
      coalesce(nullif(trim(p_schema_version), ''), 'v1')
    );
  end if;

  update public.chart_json_versions cjv
  set
    is_current = false,
    updated_at = now()
  where cjv.profile_id = p_profile_id
    and cjv.id <> v_chart_version_id
    and cjv.is_current = true
    and cjv.status = 'completed';

  update public.chart_json_versions cjv
  set
    is_current = true,
    updated_at = now()
  where cjv.id = v_chart_version_id
    and cjv.profile_id = p_profile_id
    and cjv.user_id = p_user_id
    and cjv.status = 'completed';

  update public.birth_profiles bp
  set
    current_chart_version_id = v_chart_version_id,
    input_hash = p_input_hash,
    updated_at = now()
  where bp.id = p_profile_id
    and bp.user_id = p_user_id;

  update public.chart_calculations cc
  set
    status = 'completed',
    current_chart_version_id = v_chart_version_id,
    completed_at = now(),
    updated_at = now(),
    error_code = null,
    error_message = null
  where cc.id = p_calculation_id
    and cc.user_id = p_user_id
    and cc.profile_id = p_profile_id;

  insert into public.calculation_audit_logs (
    user_id,
    profile_id,
    calculation_id,
    event,
    detail
  )
  values (
    p_user_id,
    p_profile_id,
    p_calculation_id,
    'persist_and_promote_current_chart_version',
    coalesce(p_audit_payload, '{}'::jsonb) || jsonb_build_object(
      'chart_version_id', v_chart_version_id,
      'chart_version', v_chart_version
    )
  );

  return query
  select
    v_chart_version_id as chart_version_id,
    v_chart_version as chart_version;

exception
  when others then
    update public.chart_calculations cc
    set
      status = 'failed',
      error_message = 'persist_and_promote_current_chart_version_failed: ' || sqlerrm,
      completed_at = now(),
      updated_at = now()
    where cc.id = p_calculation_id
      and cc.user_id = p_user_id
      and cc.profile_id = p_profile_id;

    raise exception 'persist_and_promote_current_chart_version_failed: %', sqlerrm;
end;
$$;

revoke all on function public.persist_and_promote_current_chart_version(
  uuid, uuid, uuid, jsonb, jsonb, text, text, text, text, jsonb
) from public;

grant execute on function public.persist_and_promote_current_chart_version(
  uuid, uuid, uuid, jsonb, jsonb, text, text, text, text, jsonb
) to service_role;

create or replace function public.promote_current_chart_version(
  p_user_id uuid,
  p_profile_id uuid,
  p_calculation_id uuid,
  p_chart_version_id uuid,
  p_input_hash text default null
)
returns table (
  chart_version_id uuid,
  chart_version integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chart_version_id uuid := p_chart_version_id;
  v_chart_version integer;
begin
  if p_user_id is null then
    raise exception 'p_user_id_required';
  end if;

  if p_profile_id is null then
    raise exception 'p_profile_id_required';
  end if;

  if p_calculation_id is null then
    raise exception 'p_calculation_id_required';
  end if;

  if p_chart_version_id is null then
    raise exception 'p_chart_version_id_required';
  end if;

  select cjv.chart_version
  into v_chart_version
  from public.chart_json_versions cjv
  where cjv.id = p_chart_version_id
    and cjv.user_id = p_user_id
    and cjv.profile_id = p_profile_id
    and cjv.status = 'completed';

  if not found then
    raise exception 'chart_version_not_found_or_not_completed';
  end if;

  perform 1
  from public.birth_profiles bp
  where bp.id = p_profile_id
    and bp.user_id = p_user_id
  for update;

  if not exists (
    select 1
    from public.chart_calculations cc
    where cc.id = p_calculation_id
      and cc.user_id = p_user_id
      and cc.profile_id = p_profile_id
  ) then
    raise exception 'chart_calculation_not_found';
  end if;

  update public.chart_json_versions cjv
  set
    is_current = false,
    updated_at = now()
  where cjv.profile_id = p_profile_id
    and cjv.is_current = true
    and cjv.id <> p_chart_version_id;

  update public.chart_json_versions cjv
  set
    is_current = true,
    updated_at = now()
  where cjv.id = p_chart_version_id
    and cjv.profile_id = p_profile_id
    and cjv.user_id = p_user_id;

  update public.birth_profiles bp
  set
    current_chart_version_id = v_chart_version_id,
    input_hash = coalesce(p_input_hash, bp.input_hash),
    updated_at = now()
  where bp.id = p_profile_id
    and bp.user_id = p_user_id;

  update public.chart_calculations cc
  set
    status = 'completed',
    current_chart_version_id = v_chart_version_id,
    completed_at = now(),
    updated_at = now(),
    error_code = null,
    error_message = null
  where cc.id = p_calculation_id
    and cc.user_id = p_user_id
    and cc.profile_id = p_profile_id;

  return query
  select
    v_chart_version_id as chart_version_id,
    v_chart_version as chart_version;
end;
$$;

revoke all on function public.promote_current_chart_version(
  uuid, uuid, uuid, uuid, text
) from public;

grant execute on function public.promote_current_chart_version(
  uuid, uuid, uuid, uuid, text
) to service_role;

commit;
