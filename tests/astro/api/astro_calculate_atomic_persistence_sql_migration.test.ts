/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/20260504124500_fix_atomic_chart_persistence_ambiguous_columns.sql',
)

const sql = fs.readFileSync(migrationPath, 'utf8')

describe('atomic chart persistence ambiguity hotfix migration', () => {
  it('contains the atomic persistence rpc replacement', () => {
    expect(sql).toContain('create or replace function public.persist_and_promote_current_chart_version')
  })

  it('uses v-prefixed local variables and explicit output aliases', () => {
    expect(sql).toContain('v_chart_version_id uuid;')
    expect(sql).toContain('v_chart_version integer;')
    expect(sql).toContain('v_chart_version_id as chart_version_id')
    expect(sql).toContain('v_chart_version as chart_version')
  })

  it('avoids the known ambiguous assignment and return patterns', () => {
    expect(sql).not.toMatch(/returning\s+chart_version_id\b/i)
    expect(sql).not.toMatch(/\binto\s+chart_version_id\b/i)
    expect(sql).not.toMatch(/\binto\s+chart_version\b/i)
    expect(sql).not.toMatch(/select\s+chart_version\s+into\s+chart_version\b/i)
  })

  it('drops the old duplicate current index and creates the canonical one', () => {
    expect(sql).toMatch(/drop\s+index\s+if\s+exists\s+public\.ux_chart_json_versions_one_current_per_profile/i)
    expect(sql).toContain('ux_chart_json_versions_one_current_completed_per_profile')
    expect(sql).toMatch(/where\s+status\s*=\s*'completed'/i)
    expect(sql).toMatch(/and\s+is_current\s*=\s*true/i)
  })

  it('grants the atomic rpc to service_role with the exact signature shape', () => {
    expect(sql).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.persist_and_promote_current_chart_version\(\s*uuid,\s*uuid,\s*uuid,\s*jsonb,\s*jsonb,\s*text,\s*text,\s*text,\s*text,\s*jsonb\s*\)\s+to\s+service_role/i,
    )
    expect(sql).toMatch(
      /revoke\s+all\s+on\s+function\s+public\.persist_and_promote_current_chart_version\(\s*uuid,\s*uuid,\s*uuid,\s*jsonb,\s*jsonb,\s*text,\s*text,\s*text,\s*text,\s*jsonb\s*\)\s+from\s+public/i,
    )
  })

  it('defines the promotion rpc with explicit qualified references', () => {
    expect(sql).toContain('create or replace function public.promote_current_chart_version')
    expect(sql).toContain('v_chart_version_id uuid := p_chart_version_id;')
    expect(sql).toContain('select cjv.chart_version')
    expect(sql).not.toMatch(/select\s+chart_version\s+into\s+chart_version\b/i)
    expect(sql).not.toMatch(/\bwhere\s+profile_id\s*=/i)
    expect(sql).not.toMatch(/\bwhere\s+user_id\s*=/i)
    expect(sql).not.toMatch(/\bwhere\s+calculation_id\s*=/i)
  })
})
