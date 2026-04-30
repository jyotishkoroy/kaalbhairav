-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.

begin;

create table if not exists public.astro_companion_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_type text not null check (memory_type in ('preference', 'recurring_concern', 'emotional_pattern', 'guidance_given', 'boundary', 'birth_context', 'relationship_context', 'career_context')),
  topic text,
  content text not null,
  confidence text not null default 'medium' check (confidence in ('low', 'medium', 'high')),
  source_message_id uuid,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists idx_astro_companion_memory_user_topic on public.astro_companion_memory(user_id, topic) where archived_at is null;
create index if not exists idx_astro_companion_memory_user_seen on public.astro_companion_memory(user_id, last_seen_at desc) where archived_at is null;

create table if not exists public.astro_reading_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id uuid,
  message_id uuid,
  rating smallint check (rating between 1 and 5),
  felt_heard boolean,
  too_generic boolean,
  too_fearful boolean,
  inaccurate boolean,
  comment text,
  created_at timestamptz not null default now()
);

alter table public.astro_companion_memory enable row level security;
alter table public.astro_reading_feedback enable row level security;

drop policy if exists "Users can read own astrology memory" on public.astro_companion_memory;
create policy "Users can read own astrology memory"
  on public.astro_companion_memory
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own astrology memory" on public.astro_companion_memory;
create policy "Users can insert own astrology memory"
  on public.astro_companion_memory
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own astrology memory" on public.astro_companion_memory;
create policy "Users can update own astrology memory"
  on public.astro_companion_memory
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own astrology feedback" on public.astro_reading_feedback;
create policy "Users can read own astrology feedback"
  on public.astro_reading_feedback
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own astrology feedback" on public.astro_reading_feedback;
create policy "Users can insert own astrology feedback"
  on public.astro_reading_feedback
  for insert
  with check (auth.uid() = user_id);

commit;
