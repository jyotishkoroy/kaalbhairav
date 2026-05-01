/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await request.json().catch(() => ({}))
  const postId = String(body.postId || '')
  const shareTarget = String(body.shareTarget || 'copy')
  if (!postId) return NextResponse.json({ ok: false, error: 'Missing postId' }, { status: 400 })
  await supabase.from('news_post_shares').insert({ post_id: postId, user_id: user?.id ?? null, share_target: shareTarget })
  return NextResponse.json({ ok: true })
}
