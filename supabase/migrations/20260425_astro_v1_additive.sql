-- Copyright (c) 2026 Jyotishko Roy.
-- Proprietary and confidential. All rights reserved.
-- Project: TarayAI - https://tarayai.com



begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_immutable_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'immutable astrology record cannot be updated; create a new version instead';
end;
$$;

create table if not exists public.birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  encrypted_birth_data text not null,
  pii_encryption_key_version integer not null default 1,
  birth_year integer,
  has_exact_birth_time boolean not null default false,
  legacy_source_table text,
  legacy_source_id text,
  legacy_imported_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_birth_profiles_user_id
  on public.birth_profiles(user_id);

drop trigger if exists trg_birth_profiles_updated on public.birth_profiles;
create trigger trg_birth_profiles_updated
  before update on public.birth_profiles
  for each row execute function public.set_updated_at();

alter table public.birth_profiles enable row level security;

drop policy if exists birth_profiles_owner_select on public.birth_profiles;
create policy birth_profiles_owner_select
  on public.birth_profiles
  for select
  using (auth.uid() = user_id);

create table if not exists public.astrology_settings (
  profile_id uuid primary key references public.birth_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  astrology_system text not null default 'parashari',
  zodiac_type text not null default 'sidereal',
  ayanamsa text not null default 'lahiri',
  house_system text not null default 'whole_sign',
  node_type text not null default 'mean_node',
  dasha_year_basis text not null default 'sidereal_365.25',
  settings_hash text,
  settings_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_astrology_settings_user_id
  on public.astrology_settings(user_id);

drop trigger if exists trg_astrology_settings_updated on public.astrology_settings;
create trigger trg_astrology_settings_updated
  before update on public.astrology_settings
  for each row execute function public.set_updated_at();

alter table public.astrology_settings enable row level security;

drop policy if exists astrology_settings_owner_select on public.astrology_settings;
create policy astrology_settings_owner_select
  on public.astrology_settings
  for select
  using (auth.uid() = user_id);

create table if not exists public.chart_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  input_hash text not null,
  settings_hash text not null,
  engine_version text not null,
  ephemeris_version text not null default 'stub',
  schema_version text not null default '1.0.0',
  force_recalc boolean not null default false,
  idempotency_key text,
  current_chart_version_id uuid,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chart_calculations_user_id
  on public.chart_calculations(user_id);

create index if not exists idx_chart_calculations_profile_status
  on public.chart_calculations(profile_id, status);

create unique index if not exists ux_chart_calculation_cache
  on public.chart_calculations(profile_id, input_hash, settings_hash, engine_version)
  where force_recalc = false;

drop trigger if exists trg_chart_calculations_updated on public.chart_calculations;
create trigger trg_chart_calculations_updated
  before update on public.chart_calculations
  for each row execute function public.set_updated_at();

alter table public.chart_calculations enable row level security;

drop policy if exists chart_calculations_owner_select on public.chart_calculations;
create policy chart_calculations_owner_select
  on public.chart_calculations
  for select
  using (auth.uid() = user_id);

create table if not exists public.chart_json_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  calculation_id uuid not null references public.chart_calculations(id) on delete cascade,
  chart_version integer not null,
  chart_json jsonb not null,
  input_hash text not null,
  settings_hash text not null,
  engine_version text not null,
  ephemeris_version text not null,
  schema_version text not null default '1.0.0',
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(profile_id, chart_version),
  unique(calculation_id)
);

create index if not exists idx_chart_json_versions_profile_created
  on public.chart_json_versions(profile_id, created_at desc);

create index if not exists idx_chart_json_versions_hashes
  on public.chart_json_versions(profile_id, input_hash, settings_hash, engine_version);

alter table public.chart_json_versions enable row level security;

drop policy if exists chart_json_versions_owner_select on public.chart_json_versions;
create policy chart_json_versions_owner_select
  on public.chart_json_versions
  for select
  using (auth.uid() = user_id);

drop trigger if exists trg_chart_json_versions_immutable_update on public.chart_json_versions;
create trigger trg_chart_json_versions_immutable_update
  before update on public.chart_json_versions
  for each row execute function public.prevent_immutable_update();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chart_calculations_current_chart_version_fk'
  ) then
    alter table public.chart_calculations
      add constraint chart_calculations_current_chart_version_fk
      foreign key (current_chart_version_id)
      references public.chart_json_versions(id)
      on delete set null;
  end if;
end;
$$;

create table if not exists public.prediction_ready_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  chart_version_id uuid not null references public.chart_json_versions(id) on delete cascade,
  topic text not null default 'general',
  prediction_context_version text not null default '1.0.0',
  prediction_context jsonb not null,
  created_at timestamptz not null default now(),
  unique(chart_version_id, topic, prediction_context_version)
);

create index if not exists idx_prediction_summaries_profile_topic
  on public.prediction_ready_summaries(profile_id, topic);

alter table public.prediction_ready_summaries enable row level security;

drop policy if exists prediction_ready_summaries_owner_select on public.prediction_ready_summaries;
create policy prediction_ready_summaries_owner_select
  on public.prediction_ready_summaries
  for select
  using (auth.uid() = user_id);

drop trigger if exists trg_prediction_ready_summaries_immutable_update on public.prediction_ready_summaries;
create trigger trg_prediction_ready_summaries_immutable_update
  before update on public.prediction_ready_summaries
  for each row execute function public.prevent_immutable_update();

create table if not exists public.astro_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  chart_version_id uuid not null references public.chart_json_versions(id) on delete restrict,
  title text,
  status text not null default 'active'
    check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_astro_chat_sessions_user_created
  on public.astro_chat_sessions(user_id, created_at desc);

create index if not exists idx_astro_chat_sessions_profile
  on public.astro_chat_sessions(profile_id);

drop trigger if exists trg_astro_chat_sessions_updated on public.astro_chat_sessions;
create trigger trg_astro_chat_sessions_updated
  before update on public.astro_chat_sessions
  for each row execute function public.set_updated_at();

alter table public.astro_chat_sessions enable row level security;

drop policy if exists astro_chat_sessions_owner_select on public.astro_chat_sessions;
create policy astro_chat_sessions_owner_select
  on public.astro_chat_sessions
  for select
  using (auth.uid() = user_id);

create table if not exists public.astro_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.astro_chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.birth_profiles(id) on delete cascade,
  chart_version_id uuid not null references public.chart_json_versions(id) on delete restrict,
  prediction_context_id uuid references public.prediction_ready_summaries(id) on delete set null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  topic text,
  model_used text,
  classifier_result jsonb,
  validation_status text,
  created_at timestamptz not null default now()
);

create index if not exists idx_astro_chat_messages_session_created
  on public.astro_chat_messages(session_id, created_at);

create index if not exists idx_astro_chat_messages_user_created
  on public.astro_chat_messages(user_id, created_at desc);

alter table public.astro_chat_messages enable row level security;

drop policy if exists astro_chat_messages_owner_select on public.astro_chat_messages;
create policy astro_chat_messages_owner_select
  on public.astro_chat_messages
  for select
  using (auth.uid() = user_id);

create table if not exists public.calculation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  profile_id uuid references public.birth_profiles(id) on delete set null,
  calculation_id uuid references public.chart_calculations(id) on delete set null,
  chart_version_id uuid references public.chart_json_versions(id) on delete set null,
  event text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_calculation_audit_logs_calculation_created
  on public.calculation_audit_logs(calculation_id, created_at);

create index if not exists idx_calculation_audit_logs_user_created
  on public.calculation_audit_logs(user_id, created_at desc);

alter table public.calculation_audit_logs enable row level security;

drop policy if exists calculation_audit_logs_owner_select on public.calculation_audit_logs;
create policy calculation_audit_logs_owner_select
  on public.calculation_audit_logs
  for select
  using (auth.uid() = user_id);

commit;