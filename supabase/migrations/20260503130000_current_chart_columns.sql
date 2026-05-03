-- Add current chart tracking columns for deterministic chart selection
alter table birth_profiles
  add column if not exists current_chart_version_id uuid references chart_json_versions(id),
  add column if not exists input_hash text;

alter table chart_json_versions
  add column if not exists input_hash text,
  add column if not exists settings_hash text,
  add column if not exists is_current boolean not null default false,
  add column if not exists status text not null default 'completed';

create index if not exists chart_json_versions_profile_current_idx
  on chart_json_versions(profile_id, is_current, created_at desc);

create index if not exists chart_json_versions_profile_input_hash_idx
  on chart_json_versions(profile_id, input_hash, created_at desc);
