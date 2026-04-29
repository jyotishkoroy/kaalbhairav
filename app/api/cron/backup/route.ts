/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()
  const date = new Date().toISOString().slice(0, 10)
  const results: Record<string, number> = {}

  const tables = [
    'profiles',
    'news_posts',
    'news_sources',
    'news_drafts',
    'news_comments',
    'astro_conversations',
    'astro_messages',
    'still_sessions',
    'still_progress',
    'daily_insights',
  ]

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*')

      if (error) throw error

      results[table] = data?.length ?? 0

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })

      const path = `${date}/${table}.json`

      await supabase.storage.from('backups').upload(path, blob, {
        contentType: 'application/json',
        upsert: true,
      })
    } catch (e) {
      console.error(`Backup failed for ${table}:`, e)
      results[table] = -1
    }
  }

  return NextResponse.json({ date, results })
}