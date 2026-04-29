-- Add GIN index on chart_json JSONB for faster expanded_sections lookups
create index if not exists idx_chart_json_versions_chart_json_gin
  on public.chart_json_versions using gin (chart_json);
