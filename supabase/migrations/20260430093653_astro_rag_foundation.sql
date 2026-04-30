-- Copyright (c) 2026 Jyotishko Roy.
-- Proprietary and confidential. All rights reserved.
-- Project: tarayai — https://tarayai.com

begin;

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.astro_chart_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid,
  chart_version_id text,
  fact_type text not null,
  fact_key text not null,
  fact_value text not null,
  planet text,
  house integer,
  sign text,
  degree_numeric numeric,
  source text not null default 'chart_json',
  confidence text not null default 'deterministic',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint astro_chart_facts_confidence_check
    check (confidence in ('deterministic', 'derived', 'imported')),
  constraint astro_chart_facts_house_check
    check (house is null or house between 1 and 12)
);

create unique index if not exists astro_chart_facts_unique_fact_idx
  on public.astro_chart_facts (
    user_id,
    coalesce(profile_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(chart_version_id, ''),
    fact_type,
    fact_key
  );

create index if not exists astro_chart_facts_user_profile_idx
  on public.astro_chart_facts(user_id, profile_id);

create index if not exists astro_chart_facts_fact_type_key_idx
  on public.astro_chart_facts(fact_type, fact_key);

create index if not exists astro_chart_facts_tags_idx
  on public.astro_chart_facts using gin (tags);

create index if not exists astro_chart_facts_fact_value_trgm_idx
  on public.astro_chart_facts using gin (fact_value gin_trgm_ops);

create index if not exists astro_chart_facts_planet_idx
  on public.astro_chart_facts(planet);

create index if not exists astro_chart_facts_house_idx
  on public.astro_chart_facts(house);

create index if not exists astro_chart_facts_sign_idx
  on public.astro_chart_facts(sign);

drop trigger if exists trg_astro_chart_facts_updated on public.astro_chart_facts;
create trigger trg_astro_chart_facts_updated
  before update on public.astro_chart_facts
  for each row execute function public.set_updated_at();

alter table public.astro_chart_facts enable row level security;

drop policy if exists astro_chart_facts_select_own on public.astro_chart_facts;
create policy astro_chart_facts_select_own
  on public.astro_chart_facts
  for select
  using (auth.uid() = user_id);

drop policy if exists astro_chart_facts_service_role_all on public.astro_chart_facts;
create policy astro_chart_facts_service_role_all
  on public.astro_chart_facts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.astro_reasoning_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  domain text not null,
  title text not null,
  description text not null,
  required_fact_types text[] not null default '{}',
  required_tags text[] not null default '{}',
  reasoning_template text not null,
  weight integer not null default 100,
  safety_notes text[] not null default '{}',
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint astro_reasoning_rules_weight_check
    check (weight between 0 and 1000)
);

create index if not exists astro_reasoning_rules_domain_idx
  on public.astro_reasoning_rules(domain);

create index if not exists astro_reasoning_rules_enabled_idx
  on public.astro_reasoning_rules(enabled);

create index if not exists astro_reasoning_rules_required_tags_idx
  on public.astro_reasoning_rules using gin (required_tags);

create index if not exists astro_reasoning_rules_description_trgm_idx
  on public.astro_reasoning_rules using gin (description gin_trgm_ops);

drop trigger if exists trg_astro_reasoning_rules_updated on public.astro_reasoning_rules;
create trigger trg_astro_reasoning_rules_updated
  before update on public.astro_reasoning_rules
  for each row execute function public.set_updated_at();

alter table public.astro_reasoning_rules enable row level security;

drop policy if exists astro_reasoning_rules_select_enabled on public.astro_reasoning_rules;
create policy astro_reasoning_rules_select_enabled
  on public.astro_reasoning_rules
  for select
  using (enabled = true);

drop policy if exists astro_reasoning_rules_service_role_all on public.astro_reasoning_rules;
create policy astro_reasoning_rules_service_role_all
  on public.astro_reasoning_rules
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.astro_benchmark_examples (
  id uuid primary key default gen_random_uuid(),
  example_key text not null unique,
  domain text not null,
  question text not null,
  answer text not null,
  reasoning text,
  accuracy_class text,
  reading_style text,
  follow_up_question text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint astro_benchmark_examples_accuracy_class_check
    check (accuracy_class is null or accuracy_class in ('totally_accurate', 'mostly_accurate', 'partial', 'unknown'))
);

create index if not exists astro_benchmark_examples_domain_idx
  on public.astro_benchmark_examples(domain);

create index if not exists astro_benchmark_examples_enabled_idx
  on public.astro_benchmark_examples(enabled);

create index if not exists astro_benchmark_examples_tags_idx
  on public.astro_benchmark_examples using gin (tags);

create index if not exists astro_benchmark_examples_question_trgm_idx
  on public.astro_benchmark_examples using gin (question gin_trgm_ops);

create index if not exists astro_benchmark_examples_answer_trgm_idx
  on public.astro_benchmark_examples using gin (answer gin_trgm_ops);

drop trigger if exists trg_astro_benchmark_examples_updated on public.astro_benchmark_examples;
create trigger trg_astro_benchmark_examples_updated
  before update on public.astro_benchmark_examples
  for each row execute function public.set_updated_at();

alter table public.astro_benchmark_examples enable row level security;

drop policy if exists astro_benchmark_examples_select_enabled on public.astro_benchmark_examples;
create policy astro_benchmark_examples_select_enabled
  on public.astro_benchmark_examples
  for select
  using (enabled = true);

drop policy if exists astro_benchmark_examples_service_role_all on public.astro_benchmark_examples;
create policy astro_benchmark_examples_service_role_all
  on public.astro_benchmark_examples
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.astro_reasoning_paths (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid,
  question text not null,
  domain text not null,
  selected_rule_ids uuid[] not null default '{}',
  path_steps jsonb not null default '[]'::jsonb,
  retrieval_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists astro_reasoning_paths_user_profile_idx
  on public.astro_reasoning_paths(user_id, profile_id);

create index if not exists astro_reasoning_paths_domain_idx
  on public.astro_reasoning_paths(domain);

create index if not exists astro_reasoning_paths_created_at_idx
  on public.astro_reasoning_paths(created_at desc);

alter table public.astro_reasoning_paths enable row level security;

drop policy if exists astro_reasoning_paths_select_own on public.astro_reasoning_paths;
create policy astro_reasoning_paths_select_own
  on public.astro_reasoning_paths
  for select
  using (auth.uid() = user_id);

drop policy if exists astro_reasoning_paths_service_role_all on public.astro_reasoning_paths;
create policy astro_reasoning_paths_service_role_all
  on public.astro_reasoning_paths
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.astro_answer_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid,
  question text not null,
  domain text not null,
  must_include text[] not null default '{}',
  must_not_include text[] not null default '{}',
  required_sections text[] not null default '{}',
  timing_allowed boolean not null default false,
  remedy_allowed boolean not null default false,
  contract jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists astro_answer_contracts_user_profile_idx
  on public.astro_answer_contracts(user_id, profile_id);

create index if not exists astro_answer_contracts_domain_idx
  on public.astro_answer_contracts(domain);

create index if not exists astro_answer_contracts_created_at_idx
  on public.astro_answer_contracts(created_at desc);

alter table public.astro_answer_contracts enable row level security;

drop policy if exists astro_answer_contracts_select_own on public.astro_answer_contracts;
create policy astro_answer_contracts_select_own
  on public.astro_answer_contracts
  for select
  using (auth.uid() = user_id);

drop policy if exists astro_answer_contracts_service_role_all on public.astro_answer_contracts;
create policy astro_answer_contracts_service_role_all
  on public.astro_answer_contracts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.astro_validation_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid,
  answer_contract_id uuid references public.astro_answer_contracts(id) on delete set null,
  question text not null,
  answer text not null,
  passed boolean not null default false,
  failures text[] not null default '{}',
  risk_flags text[] not null default '{}',
  timing_claim_allowed boolean not null default false,
  groq_used boolean not null default false,
  ollama_critic_used boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists astro_validation_results_user_profile_idx
  on public.astro_validation_results(user_id, profile_id);

create index if not exists astro_validation_results_passed_idx
  on public.astro_validation_results(passed);

create index if not exists astro_validation_results_created_at_idx
  on public.astro_validation_results(created_at desc);

alter table public.astro_validation_results enable row level security;

drop policy if exists astro_validation_results_select_own on public.astro_validation_results;
create policy astro_validation_results_select_own
  on public.astro_validation_results
  for select
  using (auth.uid() = user_id);

drop policy if exists astro_validation_results_service_role_all on public.astro_validation_results;
create policy astro_validation_results_service_role_all
  on public.astro_validation_results
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.astro_timing_windows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid,
  domain text not null,
  label text not null,
  starts_on date,
  ends_on date,
  interpretation text not null,
  source text not null,
  confidence text not null default 'partial',
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint astro_timing_windows_source_check
    check (source in ('dasha', 'varshaphal', 'python_transit', 'stored', 'user_provided')),
  constraint astro_timing_windows_confidence_check
    check (confidence in ('partial', 'strong')),
  constraint astro_timing_windows_dates_check
    check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create index if not exists astro_timing_windows_user_profile_domain_idx
  on public.astro_timing_windows(user_id, profile_id, domain);

create index if not exists astro_timing_windows_date_range_idx
  on public.astro_timing_windows(starts_on, ends_on);

create index if not exists astro_timing_windows_tags_idx
  on public.astro_timing_windows using gin (tags);

create index if not exists astro_timing_windows_source_idx
  on public.astro_timing_windows(source);

create index if not exists astro_timing_windows_confidence_idx
  on public.astro_timing_windows(confidence);

drop trigger if exists trg_astro_timing_windows_updated on public.astro_timing_windows;
create trigger trg_astro_timing_windows_updated
  before update on public.astro_timing_windows
  for each row execute function public.set_updated_at();

alter table public.astro_timing_windows enable row level security;

drop policy if exists astro_timing_windows_select_own on public.astro_timing_windows;
create policy astro_timing_windows_select_own
  on public.astro_timing_windows
  for select
  using (auth.uid() = user_id);

drop policy if exists astro_timing_windows_service_role_all on public.astro_timing_windows;
create policy astro_timing_windows_service_role_all
  on public.astro_timing_windows
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
