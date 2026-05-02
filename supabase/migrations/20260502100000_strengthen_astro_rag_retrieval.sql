-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.

BEGIN;

alter table public.astro_reasoning_rules
  add column if not exists primary_planet text,
  add column if not exists secondary_planet text,
  add column if not exists house integer,
  add column if not exists target_house integer,
  add column if not exists sign text,
  add column if not exists lordship text,
  add column if not exists dignity text,
  add column if not exists aspect_type text,
  add column if not exists yoga_name text,
  add column if not exists divisional_chart text,
  add column if not exists dasha_condition text,
  add column if not exists transit_condition text,
  add column if not exists normalized_source_text text,
  add column if not exists normalized_source_reference text,
  add column if not exists normalized_source_reliability text,
  add column if not exists normalized_embedding_text text,
  add column if not exists normalized_prompt_compact_summary text,
  add column if not exists normalized_condition jsonb default '{}'::jsonb,
  add column if not exists normalized_interpretation jsonb default '{}'::jsonb,
  add column if not exists normalized_updated_at timestamptz default now();

create index if not exists astro_reasoning_rules_primary_planet_idx on public.astro_reasoning_rules (primary_planet);
create index if not exists astro_reasoning_rules_house_idx on public.astro_reasoning_rules (house);
create index if not exists astro_reasoning_rules_sign_idx on public.astro_reasoning_rules (sign);
create index if not exists astro_reasoning_rules_lordship_idx on public.astro_reasoning_rules (lordship);
create index if not exists astro_reasoning_rules_dignity_idx on public.astro_reasoning_rules (dignity);
create index if not exists astro_reasoning_rules_aspect_type_idx on public.astro_reasoning_rules (aspect_type);
create index if not exists astro_reasoning_rules_yoga_name_idx on public.astro_reasoning_rules (yoga_name);
create index if not exists astro_reasoning_rules_divisional_chart_idx on public.astro_reasoning_rules (divisional_chart);
create index if not exists astro_reasoning_rules_source_reliability_idx on public.astro_reasoning_rules (normalized_source_reliability);
create index if not exists astro_reasoning_rules_life_area_tags_gin on public.astro_reasoning_rules using gin (life_area_tags);
create index if not exists astro_reasoning_rules_condition_tags_gin on public.astro_reasoning_rules using gin (condition_tags);
create index if not exists astro_reasoning_rules_retrieval_keywords_gin on public.astro_reasoning_rules using gin (retrieval_keywords);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'astro_reasoning_rules'
      and column_name = 'required_tags'
  ) then
    execute 'create index if not exists astro_reasoning_rules_required_tags_gin on public.astro_reasoning_rules using gin (required_tags)';
  end if;
end $$;

commit;
