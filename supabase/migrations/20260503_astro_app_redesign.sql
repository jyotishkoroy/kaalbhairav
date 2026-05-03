-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.

-- App redesign migration: one active profile per user, terms acceptance, new profile columns
-- Idempotent: safe to run multiple times

-- Add new columns to birth_profiles if they don't exist
alter table public.birth_profiles add column if not exists google_email text;
alter table public.birth_profiles add column if not exists google_name text;
alter table public.birth_profiles add column if not exists about_self text;
alter table public.birth_profiles add column if not exists terms_accepted_at timestamptz;
alter table public.birth_profiles add column if not exists terms_accepted_version text;
alter table public.birth_profiles add column if not exists last_birth_details_updated_at timestamptz;
alter table public.birth_profiles add column if not exists birth_details_change_available_at timestamptz;
alter table public.birth_profiles add column if not exists canonical_profile boolean not null default true;

-- Archive duplicate active profiles before creating unique index.
-- Keep most recent (by created_at desc, id desc), archive the rest.
with ranked as (
  select id,
         row_number() over (
           partition by user_id
           order by created_at desc, id desc
         ) as rn
  from public.birth_profiles
  where status = 'active'
)
update public.birth_profiles
set status = 'archived'
where id in (
  select id from ranked where rn > 1
);

-- Partial unique index: only one active profile per user
create unique index if not exists ux_birth_profiles_one_active_per_user
  on public.birth_profiles(user_id)
  where status = 'active';

-- Indexes for efficient queries
create index if not exists ix_birth_profiles_user_status_created
  on public.birth_profiles(user_id, status, created_at desc);

create index if not exists ix_birth_profiles_user_change_available
  on public.birth_profiles(user_id, birth_details_change_available_at);

-- User terms acceptances table
create table if not exists public.user_terms_acceptances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  source text not null default 'astro_setup',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ix_user_terms_acceptances_accepted_at
  on public.user_terms_acceptances(accepted_at desc);

-- Enable RLS
alter table public.user_terms_acceptances enable row level security;

-- Owner can select own row
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

-- service_role has full access (implicit via superuser bypass on service role)
-- No anonymous writes: only authenticated inserts by owner
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
