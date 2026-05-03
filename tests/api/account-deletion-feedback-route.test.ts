/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/account/deletion-feedback', () => ({
  saveAccountDeletionFeedback: vi.fn(async () => ({ ok: true })),
}))

import { createServiceClient } from '@/lib/supabase/server'
import { saveAccountDeletionFeedback } from '@/lib/account/deletion-feedback'
import { GET, POST } from '@/app/api/account/deletion-feedback/route'

describe('account deletion feedback route', () => {
  it('accepts valid feedback', async () => {
    vi.mocked(createServiceClient).mockReturnValue({} as never)
    const req = new NextRequest('http://localhost/api/account/deletion-feedback', {
      method: 'POST',
      body: JSON.stringify({ token: 'raw', feedback: 'Nice' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(saveAccountDeletionFeedback).toHaveBeenCalled()
  })

  it('rejects unsupported methods', async () => {
    const res = await GET()
    expect(res.status).toBe(405)
  })
})
