-- Copyright (c) 2026 Jyotishko Roy.
-- Proprietary and confidential. All rights reserved. Project: tarayai — https://tarayai.com

begin;

alter table public.astro_reasoning_rules
  add column if not exists source_reference text,
  add column if not exists source_reliability text,
  add column if not exists structured_rule jsonb not null default '{}'::jsonb,
  add column if not exists life_area_tags text[] not null default '{}',
  add column if not exists condition_tags text[] not null default '{}',
  add column if not exists retrieval_keywords text[] not null default '{}';

alter table public.astro_benchmark_examples
  add column if not exists linked_rule_ids text[] not null default '{}',
  add column if not exists example_type text,
  add column if not exists user_question text,
  add column if not exists chart_condition_summary text,
  add column if not exists retrieved_rules text[] not null default '{}',
  add column if not exists good_answer_example text,
  add column if not exists bad_answer_example text,
  add column if not exists why_good_answer_is_good text,
  add column if not exists why_bad_answer_is_bad text,
  add column if not exists life_area_tags text[] not null default '{}',
  add column if not exists condition_tags text[] not null default '{}',
  add column if not exists safety_notes text[] not null default '{}';

create table if not exists public.astro_source_notes (
  source_id text primary key,
  source_name text not null,
  source_type text not null,
  reliability_level text,
  recommended_usage text,
  limitations text,
  citation_guidance text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists astro_source_notes_type_idx on public.astro_source_notes(source_type);

create table if not exists public.astro_retrieval_tags (
  tag_id text primary key,
  tag_name text not null,
  tag_category text,
  description text,
  synonyms text[] not null default '{}',
  related_tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists astro_retrieval_tags_category_idx on public.astro_retrieval_tags(tag_category);
create index if not exists astro_retrieval_tags_synonyms_idx on public.astro_retrieval_tags using gin (synonyms);
create index if not exists astro_retrieval_tags_related_tags_idx on public.astro_retrieval_tags using gin (related_tags);

create table if not exists public.astro_validation_checks (
  check_id text primary key,
  check_category text,
  check_statement text not null,
  failure_pattern text,
  correction_instruction text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists astro_validation_checks_category_idx on public.astro_validation_checks(check_category);

drop trigger if exists trg_astro_source_notes_updated on public.astro_source_notes;
create trigger trg_astro_source_notes_updated
  before update on public.astro_source_notes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_astro_retrieval_tags_updated on public.astro_retrieval_tags;
create trigger trg_astro_retrieval_tags_updated
  before update on public.astro_retrieval_tags
  for each row execute function public.set_updated_at();

drop trigger if exists trg_astro_validation_checks_updated on public.astro_validation_checks;
create trigger trg_astro_validation_checks_updated
  before update on public.astro_validation_checks
  for each row execute function public.set_updated_at();

alter table public.astro_source_notes enable row level security;
alter table public.astro_retrieval_tags enable row level security;
alter table public.astro_validation_checks enable row level security;

drop policy if exists astro_source_notes_select_enabled on public.astro_source_notes;
create policy astro_source_notes_select_enabled
  on public.astro_source_notes
  for select
  using (true);

drop policy if exists astro_source_notes_service_role_all on public.astro_source_notes;
create policy astro_source_notes_service_role_all
  on public.astro_source_notes
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists astro_retrieval_tags_select_enabled on public.astro_retrieval_tags;
create policy astro_retrieval_tags_select_enabled
  on public.astro_retrieval_tags
  for select
  using (true);

drop policy if exists astro_retrieval_tags_service_role_all on public.astro_retrieval_tags;
create policy astro_retrieval_tags_service_role_all
  on public.astro_retrieval_tags
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists astro_validation_checks_select_enabled on public.astro_validation_checks;
create policy astro_validation_checks_select_enabled
  on public.astro_validation_checks
  for select
  using (true);

drop policy if exists astro_validation_checks_service_role_all on public.astro_validation_checks;
create policy astro_validation_checks_service_role_all
  on public.astro_validation_checks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
