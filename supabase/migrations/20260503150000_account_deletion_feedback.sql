-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.

begin;

create table if not exists public.account_deletion_feedback_tokens (
  id uuid primary key default gen_random_uuid(),
  deleted_user_id uuid not null references public.deleted_users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz null
);

create index if not exists account_deletion_feedback_tokens_token_hash_idx on public.account_deletion_feedback_tokens (token_hash);
create index if not exists account_deletion_feedback_tokens_deleted_user_id_idx on public.account_deletion_feedback_tokens (deleted_user_id);
alter table public.account_deletion_feedback_tokens enable row level security;

create table if not exists public.account_deletion_feedback (
  id uuid primary key default gen_random_uuid(),
  deleted_user_id uuid references public.deleted_users(id) on delete set null,
  name text not null,
  feedback text not null,
  submitted_at timestamptz not null default now(),
  source text not null default 'account_deleted_exit_page'
);

create index if not exists account_deletion_feedback_deleted_user_id_idx on public.account_deletion_feedback (deleted_user_id);
create index if not exists account_deletion_feedback_submitted_at_idx on public.account_deletion_feedback (submitted_at desc);
alter table public.account_deletion_feedback enable row level security;

commit;
