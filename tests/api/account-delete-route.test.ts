/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

vi.mock('@/lib/security/request-guards', () => ({
  assertSameOriginRequest: vi.fn(() => ({ ok: true })),
}))

vi.mock('@/lib/account/delete-account', () => ({
  deleteAccountAndUserData: vi.fn(),
}))

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { deleteAccountAndUserData } from '@/lib/account/delete-account'
import { DELETE } from '@/app/api/account/delete/route'

function makeReq() {
  return new NextRequest('http://localhost/api/account/delete', { method: 'DELETE' })
}

describe('DELETE /api/account/delete', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } as never)

    const res = await DELETE(makeReq())
    expect(res.status).toBe(401)
  })

  it('deletes account data then returns ok', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'x@y.com', user_metadata: { full_name: 'X' } } } }) },
    } as never)
    vi.mocked(createServiceClient).mockReturnValue({} as never)
    vi.mocked(deleteAccountAndUserData).mockResolvedValue({ ok: true, name: 'X' } as never)

    const res = await DELETE(makeReq())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(deleteAccountAndUserData).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1' }))
  })

  it('returns generic error on failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => void 0)
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u2', email: 'x@y.com', user_metadata: {} } } }) },
    } as never)
    vi.mocked(createServiceClient).mockReturnValue({} as never)
    vi.mocked(deleteAccountAndUserData).mockRejectedValue(new Error('db password is ...'))

    const res = await DELETE(makeReq())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'account_deletion_failed' })
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('does not leak private error details to browser', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u3', user_metadata: {} } } }) },
    } as never)
    vi.mocked(createServiceClient).mockReturnValue({} as never)
    vi.mocked(deleteAccountAndUserData).mockRejectedValue(new Error('permission denied for table birth_profiles'))

    const res = await DELETE(makeReq())
    const body = await res.json()
    expect(JSON.stringify(body)).not.toContain('birth_profiles')
  })
})
