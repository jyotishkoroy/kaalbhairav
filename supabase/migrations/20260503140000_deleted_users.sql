-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.

begin;

create table if not exists public.deleted_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  deleted_at timestamptz not null default now(),
  deletion_source text not null default 'account_settings'
);

alter table public.deleted_users enable row level security;

commit;
