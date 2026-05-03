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
    expect(html).not.toContain('permission denied')
  })

  it('calls delete endpoint and redirects on success', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }))
    const confirmImpl = vi.fn(() => true)
    await deleteAccountFlow({
      confirmImpl,
      fetchImpl: fetchImpl as never,
      onSuccess: () => {
        replace('/sign-in')
        refresh()
      },
      onFailure: () => void 0,
    })

    expect(fetchImpl).toHaveBeenCalledWith('/api/account/delete', { method: 'DELETE' })
    expect(replace).toHaveBeenCalledWith('/sign-in')
    expect(refresh).toHaveBeenCalled()
  })

  it('shows generic error on failure', async () => {
    const onFailure = vi.fn()
    const fetchImpl = vi.fn(async () => ({ ok: false }))
    await deleteAccountFlow({
      confirmImpl: vi.fn(() => true),
      fetchImpl: fetchImpl as never,
      onSuccess: () => void 0,
      onFailure,
    })

    expect(onFailure).toHaveBeenCalled()
  })

  it('does not proceed when confirmation is cancelled', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }))
    await deleteAccountFlow({
      confirmImpl: vi.fn(() => false),
      fetchImpl: fetchImpl as never,
      onSuccess: () => void 0,
      onFailure: () => void 0,
    })

    expect(fetchImpl).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })
})
