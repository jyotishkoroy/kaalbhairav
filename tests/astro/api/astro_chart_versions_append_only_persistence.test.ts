/*
Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
commercially use, train models on, scrape, or create derivative works from this
repository or any part of it without prior written permission from Jyotishko Roy.
*/

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('chart_json_versions append-only persistence', () => {
  const migrationPath = path.join(
    process.cwd(),
    'supabase/migrations/20260505123000_make_chart_json_versions_append_only_rpc.sql',
  )

  it('inserts new chart rows and only demotes current rows by profile_id', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')

    expect(sql).toContain('insert into public.chart_json_versions')
    expect(sql).toContain('update public.chart_json_versions')
    expect(sql).toContain('where profile_id = p_profile_id')
    expect(sql).toContain('set is_current = false')
    expect(sql).toContain('current_chart_version_id = $1')
    expect(sql).toContain("status = ''completed''")
  })

  it('does not update immutable chart_json_versions payload columns', () => {
    const sql = fs.readFileSync(migrationPath, 'utf8')

    expect(sql).not.toContain('set chart_json =')
    expect(sql).not.toContain('set user_id =')
    expect(sql).not.toContain('set profile_id =')
    expect(sql).not.toContain('set calculation_id =')
    expect(sql).not.toContain('set input_hash =')
    expect(sql).not.toContain('set settings_hash =')
    expect(sql).not.toContain('set engine_version =')
    expect(sql).not.toContain('set ephemeris_version =')
    expect(sql).not.toContain('set ayanamsha =')
    expect(sql).not.toContain('set house_system =')
    expect(sql).not.toContain('set schema_version =')
    expect(sql).not.toContain('set chart_version =')
    expect(sql).not.toContain('set prediction_summary =')
    expect(sql).not.toContain('set created_at =')
  })
})
