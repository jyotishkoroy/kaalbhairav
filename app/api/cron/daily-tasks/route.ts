/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 90

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')

  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.tarayai.com'
  const results: Record<string, unknown> = {}

  try {
    const insight = await fetch(`${base}/api/cron/daily-insight`, {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })

    results.insight = await insight.json()
  } catch (e) {
    results.insight = { error: String(e) }
  }

  try {
    const backup = await fetch(`${base}/api/cron/backup`, {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
      },
    })

    results.backup = await backup.json()
  } catch (e) {
    results.backup = { error: String(e) }
  }

  return NextResponse.json(results)
}