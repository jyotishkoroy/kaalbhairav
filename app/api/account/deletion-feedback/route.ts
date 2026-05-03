/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { saveAccountDeletionFeedback } from '@/lib/account/deletion-feedback'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token?: unknown; feedback?: unknown }
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const feedback = typeof body.feedback === 'string' ? body.feedback : ''
    if (!token || typeof body.feedback !== 'string') {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const service = createServiceClient()
    await saveAccountDeletionFeedback({ service, token, feedback })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'feedback_save_failed' }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 })
}
