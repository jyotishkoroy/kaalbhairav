-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.

-- Additive migration: place/elevation columns for birth_profiles
-- Safe to run multiple times (idempotent)

-- Elevation in meters from birth place (optional, nullable)
alter table public.birth_profiles add column if not exists birth_elevation_meters numeric;

-- Place provider identifier (e.g. nominatim place_id)
alter table public.birth_profiles add column if not exists birth_place_provider text;

-- Provider place ID for deduplication
alter table public.birth_profiles add column if not exists birth_place_id text;

-- Index on place provider for lookups
create index if not exists ix_birth_profiles_place_provider
  on public.birth_profiles(birth_place_provider)
  where birth_place_provider is not null;

-- Re-assert the 20260503 migration is idempotent — ensure all prior columns exist
-- These are safe no-ops if already applied:
alter table public.birth_profiles add column if not exists google_email text;
alter table public.birth_profiles add column if not exists google_name text;
alter table public.birth_profiles add column if not exists about_self text;
alter table public.birth_profiles add column if not exists terms_accepted_at timestamptz;
alter table public.birth_profiles add column if not exists terms_accepted_version text;
alter table public.birth_profiles add column if not exists last_birth_details_updated_at timestamptz;
alter table public.birth_profiles add column if not exists birth_details_change_available_at timestamptz;
alter table public.birth_profiles add column if not exists canonical_profile boolean not null default true;

-- Ensure the unique active-profile index exists
create unique index if not exists ux_birth_profiles_one_active_per_user
  on public.birth_profiles(user_id)
  where status = 'active';

-- Ensure user_terms_acceptances table exists (idempotent)
create table if not exists public.user_terms_acceptances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null default 'astro_setup',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_terms_acceptances enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_terms_acceptances'
      and policyname = 'owner_select'
  ) then
    execute $policy$
      create policy owner_select on public.user_terms_acceptances
        for select
        using (auth.uid() = user_id)
    $policy$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_terms_acceptances'
      and policyname = 'owner_upsert'
  ) then
    execute $policy$
      create policy owner_upsert on public.user_terms_acceptances
        for all
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id)
    $policy$;
  end if;
end $$;
