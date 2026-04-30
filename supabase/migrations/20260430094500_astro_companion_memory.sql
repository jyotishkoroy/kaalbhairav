-- Copyright (c) 2026 Jyotishko Roy.
-- Proprietary and confidential. All rights reserved.
-- Project: tarayai — https://tarayai.com

begin;

create table if not exists public.astro_companion_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid,
  memory_key text not null,
  memory_summary text not null,
  domains text[] not null default '{}',
  open_follow_up text,
  language_preference text,
  tone_preference text,
  safety_redactions text[] not null default '{}',
  source_turn_count integer not null default 1,
  last_topic text,
  last_concern text,
  advice_given text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint astro_companion_memory_memory_key_length_check check (char_length(memory_key) <= 120),
  constraint astro_companion_memory_memory_summary_length_check check (char_length(memory_summary) <= 3000)
);

create unique index if not exists astro_companion_memory_user_profile_key_idx
  on public.astro_companion_memory(user_id, profile_id, memory_key);

create index if not exists astro_companion_memory_user_profile_idx
  on public.astro_companion_memory(user_id, profile_id);

create index if not exists astro_companion_memory_domains_idx
  on public.astro_companion_memory using gin (domains);

create index if not exists astro_companion_memory_updated_at_idx
  on public.astro_companion_memory(updated_at desc);

drop trigger if exists trg_astro_companion_memory_updated on public.astro_companion_memory;
create trigger trg_astro_companion_memory_updated
  before update on public.astro_companion_memory
  for each row execute function public.set_updated_at();

alter table public.astro_companion_memory enable row level security;

drop policy if exists astro_companion_memory_select_own on public.astro_companion_memory;
create policy astro_companion_memory_select_own
  on public.astro_companion_memory
  for select
  using (auth.uid() = user_id);

drop policy if exists astro_companion_memory_insert_own on public.astro_companion_memory;
create policy astro_companion_memory_insert_own
  on public.astro_companion_memory
  for insert
  with check (auth.uid() = user_id);

drop policy if exists astro_companion_memory_update_own on public.astro_companion_memory;
create policy astro_companion_memory_update_own
  on public.astro_companion_memory
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists astro_companion_memory_service_role_all on public.astro_companion_memory;
create policy astro_companion_memory_service_role_all
  on public.astro_companion_memory
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
