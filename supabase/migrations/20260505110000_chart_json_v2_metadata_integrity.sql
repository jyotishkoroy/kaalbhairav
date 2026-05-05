--
-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.
--
-- Phase 15: ensure canonical chart_json_v2 metadata is written only after row id exists
-- and current-chart pointers stay atomic with versioned persistence.

begin;

alter table public.birth_profiles
  add column if not exists current_chart_version_id uuid references public.chart_json_versions(id) on delete set null;

alter table public.chart_calculations
  add column if not exists current_chart_version_id uuid references public.chart_json_versions(id) on delete set null;

create unique index if not exists ux_chart_json_versions_one_current_completed_per_profile
  on public.chart_json_versions(profile_id)
  where is_current = true and status = 'completed';

create index if not exists chart_json_versions_user_profile_created_idx
  on public.chart_json_versions(user_id, profile_id, created_at desc);

create index if not exists birth_profiles_current_chart_version_id_idx
  on public.birth_profiles(current_chart_version_id);

create or replace function public.persist_and_promote_current_chart_version(
  p_user_id uuid,
  p_profile_id uuid,
  p_calculation_id uuid,
  p_chart_json jsonb,
  p_prediction_summary jsonb default null,
  p_input_hash text default null,
  p_settings_hash text default null,
  p_engine_version text default null,
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
    created_at
  )
  values (
    p_user_id,
    p_profile_id,
    p_calculation_id,
    v_next_version,
    p_chart_json,
    p_schema_version,
    'pending',
    false,
    p_input_hash,
    p_settings_hash,
    p_engine_version,
    now()
  )
  returning id into v_chart_version_id;

  v_chart_json := jsonb_set(
    jsonb_set(
      p_chart_json,
      '{metadata,chartVersionId}',
      to_jsonb(v_chart_version_id::text),
      true
    ),
    '{metadata,chartVersion}',
    to_jsonb(v_next_version),
    true
  );

  update public.chart_json_versions
  set chart_json = v_chart_json,
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
  jsonb
) to authenticated;

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
  jsonb
) to service_role;

commit;
