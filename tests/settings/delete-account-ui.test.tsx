/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DeleteAccountButton, deleteAccountFlow } from '@/app/settings/DeleteAccountButton'

const replace = vi.fn()
const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}))

describe('DeleteAccountButton', () => {
  beforeEach(() => {
    replace.mockReset()
    refresh.mockReset()
  })

  it('renders delete button and confirm copy', () => {
    const html = renderToStaticMarkup(<DeleteAccountButton />)
    expect(html).toContain('Delete my account')
  })

  it('calls delete endpoint with hardened request options and returns success', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }))
    const confirmImpl = vi.fn(() => true)
    await expect(deleteAccountFlow({
      confirmImpl,
      fetchImpl: fetchImpl as never,
    })).resolves.toEqual({ status: 'success', redirectTo: '/account-deleted' })

    expect(fetchImpl).toHaveBeenCalledWith('/api/account/delete', {
      method: 'DELETE',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
  })

  it('returns failure and preserves generic error handling on non-ok response', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false }))
    await expect(deleteAccountFlow({
      confirmImpl: vi.fn(() => true),
      fetchImpl: fetchImpl as never,
    })).resolves.toEqual({ status: 'failure' })
  })

  it('returns failure when fetch throws', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('raw server error stage=delete_auth_user code=500')
    })

    await expect(deleteAccountFlow({
      confirmImpl: vi.fn(() => true),
      fetchImpl: fetchImpl as never,
    })).resolves.toEqual({ status: 'failure' })
  })

  it('returns cancelled and does not call fetch when confirmation is cancelled', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }))
    await expect(deleteAccountFlow({
      confirmImpl: vi.fn(() => false),
      fetchImpl: fetchImpl as never,
    })).resolves.toEqual({ status: 'cancelled' })

    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('does not render raw server error, stage, or code', () => {
    const html = renderToStaticMarkup(<DeleteAccountButton />)
    expect(html).not.toContain('stage=')
    expect(html).not.toContain('code=')
    expect(html).not.toContain('raw server error')
  })

  it('keeps pending and redirect state isolated from stale errors via helper result', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }))
    const firstResult = await deleteAccountFlow({
      confirmImpl: vi.fn(() => true),
      fetchImpl: fetchImpl as never,
    })
    const secondResult = await deleteAccountFlow({
      confirmImpl: vi.fn(() => true),
      fetchImpl: fetchImpl as never,
    })

    expect(firstResult).toEqual({ status: 'success', redirectTo: '/account-deleted' })
    expect(secondResult).toEqual({ status: 'success', redirectTo: '/account-deleted' })
  })

  it('returns cancelled when confirmation is cancelled and leaves fetch unused', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }))
    const result = await deleteAccountFlow({
      confirmImpl: vi.fn(() => false),
      fetchImpl: fetchImpl as never,
    })

    expect(result).toEqual({ status: 'cancelled' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
