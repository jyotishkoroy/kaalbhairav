-- Copyright (c) 2026 Jyotishko Roy.
-- Proprietary and confidential. All rights reserved.
-- Project: tarayai — https://tarayai.com

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

create table if not exists public.news_sources (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  source_type text not null,
  url text,
  archive_query text,
  topic_hints text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_news_sources_updated on public.news_sources;
create trigger trg_news_sources_updated
  before update on public.news_sources
  for each row execute function public.set_updated_at();

create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  body text not null,
  excerpt text,
  status text not null default 'published',
  topic text not null default 'other',
  source_id uuid references public.news_sources(id) on delete set null,
  source_name text not null,
  source_type text not null,
  original_url text not null,
  external_id text,
  canonical_url text,
  title_hash text not null,
  content_hash text not null,
  published_at timestamptz,
  scheduled_slot text,
  kolkata_date date,
  ingestion_run_id uuid,
  raw jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_posts add constraint news_posts_original_url_unique unique (original_url);
alter table public.news_posts add constraint news_posts_title_hash_unique unique (title_hash);
alter table public.news_posts add constraint news_posts_content_hash_unique unique (content_hash);
create unique index if not exists news_posts_source_external_unique
  on public.news_posts (source_name, external_id)
  where external_id is not null;

drop trigger if exists trg_news_posts_updated on public.news_posts;
create trigger trg_news_posts_updated
  before update on public.news_posts
  for each row execute function public.set_updated_at();

create table if not exists public.news_ingest_runs (
  id uuid primary key default gen_random_uuid(),
  slot text not null,
  kolkata_date date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  selected_source_key text,
  selected_source_name text,
  selected_topic text,
  selected_post_id uuid references public.news_posts(id) on delete set null,
  status text not null default 'started',
  attempted_sources jsonb not null default '[]'::jsonb,
  skipped_duplicates jsonb not null default '[]'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  fallback_reason text,
  created_at timestamptz not null default now(),
  unique(kolkata_date, slot)
);

create table if not exists public.news_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.news_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table if not exists public.news_post_shares (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.news_posts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  share_target text not null default 'copy',
  created_at timestamptz not null default now()
);

alter table public.news_sources enable row level security;
alter table public.news_posts enable row level security;
alter table public.news_ingest_runs enable row level security;
alter table public.news_post_likes enable row level security;
alter table public.news_post_shares enable row level security;

drop policy if exists news_posts_authenticated_select on public.news_posts;
create policy news_posts_authenticated_select on public.news_posts for select using (auth.uid() is not null and status = 'published');
drop policy if exists news_post_likes_own on public.news_post_likes;
create policy news_post_likes_own on public.news_post_likes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists news_post_shares_own on public.news_post_shares;
create policy news_post_shares_own on public.news_post_shares for insert with check (auth.uid() = user_id or user_id is null);
drop policy if exists news_ingest_runs_service_role on public.news_ingest_runs;
create policy news_ingest_runs_service_role on public.news_ingest_runs for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
drop policy if exists news_sources_service_role on public.news_sources;
create policy news_sources_service_role on public.news_sources for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

insert into public.news_sources (key, name, source_type, url, archive_query, topic_hints, is_active)
values
('internet-archive-occult', 'Internet Archive', 'internet_archive', 'https://archive.org/advancedsearch.php', 'subject:(occult) OR subject:(tantra) OR subject:(shaivism) OR subject:(hinduism) OR subject:(mythology) OR subject:(esotericism) OR subject:(alchemy) OR subject:(hermeticism)', array['archive','occult','tantra','manuscript'], true),
('correspondences-journal', 'Correspondences Journal', 'rss', 'https://correspondencesjournal.com/feed/', null, array['esotericism','occult','research'], true),
('ein-religion-news', 'EIN Religion News', 'rss', 'https://religion.einnews.com/all_rss', null, array['religion','deity','temple'], true),
('archaeology-magazine', 'Archaeology Magazine', 'rss', 'https://archaeology.org/feed/', null, array['archaeology','temple','ritual'], true),
('arkeonews', 'Arkeonews', 'rss', 'https://arkeonews.net/feed/', null, array['archaeology','mythology','ancient religion'], true),
('live-science-archaeology', 'Live Science Archaeology', 'rss', 'https://www.livescience.com/feeds/tag/archaeology', null, array['archaeology','ancient history','ritual'], true)
on conflict (key) do update set updated_at = now();

commit;
