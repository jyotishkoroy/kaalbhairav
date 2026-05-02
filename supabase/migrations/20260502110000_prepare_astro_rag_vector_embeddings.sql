-- Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
-- commercially use, train models on, scrape, or create derivative works from this
-- repository or any part of it without prior written permission from Jyotishko Roy.

do $$
begin
  begin
    create extension if not exists vector;
  exception when insufficient_privilege or undefined_file or feature_not_supported then
    raise notice 'pgvector extension not available, skipping vector preparation';
  end;

  if exists (
    select 1
    from pg_extension
    where extname = 'vector'
  ) then
    alter table if exists public.astro_reasoning_rules
      add column if not exists embedding vector(1536);

    do $idx$
    begin
      begin
        execute 'create index if not exists astro_reasoning_rules_embedding_idx on public.astro_reasoning_rules using ivfflat (embedding vector_cosine_ops) with (lists = 100)';
      exception when undefined_object or feature_not_supported or insufficient_privilege then
        raise notice 'vector index not created';
      end;
    end;
    $idx$;
  end if;
end
$$;
