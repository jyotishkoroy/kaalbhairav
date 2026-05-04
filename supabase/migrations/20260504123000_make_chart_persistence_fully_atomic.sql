-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.
--
-- Phase 1: fully atomic chart persistence for new calculate writes.

begin;

alter table public.chart_json_versions
  add column if not exists calculation_id uuid,
  add column if not exists input_hash text,
  add column if not exists settings_hash text,
  add column if not exists engine_version text,
  add column if not exists schema_version text,
  add column if not exists status text not null default 'completed',
  add column if not exists is_current boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.birth_profiles
  add column if not exists current_chart_version_id uuid references public.chart_json_versions(id) on delete set null,
  add column if not exists input_hash text;

alter table public.chart_calculations
  add column if not exists current_chart_version_id uuid references public.chart_json_versions(id) on delete set null,
  add column if not exists completed_at timestamptz,
  add column if not exists error_message text;

alter table public.prediction_ready_summaries
  add column if not exists chart_version_id uuid references public.chart_json_versions(id) on delete cascade;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chart_json_versions'
      and column_name = 'ephemeris_version'
  ) then
    alter table public.chart_json_versions add column ephemeris_version text;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'ux_chart_json_versions_one_current_per_profile'
  ) then
    create unique index if not exists ux_chart_json_versions_one_current_completed_per_profile
      on public.chart_json_versions(profile_id)
      where is_current = true and status = 'completed';
  end if;
end;
$$;

with ranked as (
  select
    id,
    row_number() over (
      partition by profile_id
      order by created_at desc, id desc
    ) as rn
  from public.chart_json_versions
  where is_current = true
    and status = 'completed'
)
update public.chart_json_versions cjv
set is_current = false,
    updated_at = now()
from ranked r
where cjv.id = r.id
  and r.rn > 1;

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
returns table(
  chart_version_id uuid,
  chart_version integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.birth_profiles%rowtype;
  v_calculation public.chart_calculations%rowtype;
  v_next_chart_version integer;
  v_chart_version_id uuid := gen_random_uuid();
  v_summary_table_exists boolean;
  v_audit_table_exists boolean;
  v_chart_json jsonb;
begin
  if p_chart_json is null or jsonb_typeof(p_chart_json) <> 'object' then
    raise exception 'invalid_chart_json';
  end if;

  select *
  into v_profile
  from public.birth_profiles
  where id = p_profile_id
  for update;

  if not found then
    raise exception 'profile_not_found';
  end if;

  if v_profile.user_id <> p_user_id then
    raise exception 'profile_user_mismatch';
  end if;

  select *
  into v_calculation
  from public.chart_calculations
  where id = p_calculation_id
  for update;

  if not found then
    raise exception 'calculation_not_found';
  end if;

  if v_calculation.user_id <> p_user_id or v_calculation.profile_id <> p_profile_id then
    raise exception 'calculation_profile_mismatch';
  end if;

  select coalesce(max(cjv.chart_version), 0) + 1
  into v_next_chart_version
  from public.chart_json_versions cjv
  where cjv.profile_id = p_profile_id;

  update public.chart_json_versions cjv
  set is_current = false,
      updated_at = now()
  where cjv.profile_id = p_profile_id
    and cjv.is_current = true;

  v_chart_json := jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          p_chart_json,
          '{metadata,chart_version_id}',
          to_jsonb(v_chart_version_id),
          true
        ),
        '{metadata,chart_version}',
        to_jsonb(v_next_chart_version),
        true
      ),
      '{metadata,input_hash}',
      to_jsonb(p_input_hash),
      true
    ),
    '{metadata,settings_hash}',
    to_jsonb(p_settings_hash),
    true
  );

  v_chart_json := jsonb_set(
    jsonb_set(
      v_chart_json,
      '{metadata,engine_version}',
      to_jsonb(p_engine_version),
      true
    ),
    '{metadata,schema_version}',
    to_jsonb(p_schema_version),
    true
  );

  insert into public.chart_json_versions (
    id,
    user_id,
    profile_id,
    calculation_id,
    chart_version,
    chart_json,
    input_hash,
    settings_hash,
    engine_version,
    ephemeris_version,
    schema_version,
    status,
    is_current,
    created_at,
    updated_at
  )
  values (
    v_chart_version_id,
    p_user_id,
    p_profile_id,
    p_calculation_id,
    v_next_chart_version,
    v_chart_json,
    p_input_hash,
    p_settings_hash,
    p_engine_version,
    coalesce((p_chart_json #>> '{metadata,ephemeris_version}'), 'stub'),
    p_schema_version,
    'completed',
    true,
    now(),
    now()
  );

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'prediction_ready_summaries'
  )
  into v_summary_table_exists;

  if v_summary_table_exists and p_prediction_summary is not null then
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

  update public.birth_profiles bp
  set current_chart_version_id = v_chart_version_id,
      input_hash = p_input_hash,
      updated_at = now()
  where bp.id = p_profile_id
    and bp.user_id = p_user_id;

  update public.chart_calculations cc
  set current_chart_version_id = v_chart_version_id,
      status = 'completed',
      completed_at = now(),
      error_code = null,
      error_message = null,
      updated_at = now()
  where cc.id = p_calculation_id
    and cc.user_id = p_user_id
    and cc.profile_id = p_profile_id;

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'calculation_audit_logs'
  )
  into v_audit_table_exists;

  if v_audit_table_exists then
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
        'chart_version', v_next_chart_version,
        'schema_version', p_schema_version
      )
    );
  end if;

  return query
  select v_chart_version_id, v_next_chart_version;
end;
$$;

revoke all on function public.persist_and_promote_current_chart_version(uuid, uuid, uuid, jsonb, jsonb, text, text, text, text, jsonb) from public;
grant execute on function public.persist_and_promote_current_chart_version(uuid, uuid, uuid, jsonb, jsonb, text, text, text, text, jsonb) to service_role;

commit;
