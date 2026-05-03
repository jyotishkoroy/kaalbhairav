/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

'use client'

import { useState } from 'react'

export async function deleteAccountFlow(input: {
  confirmImpl: (message: string) => boolean
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
}) : Promise<{ status: 'cancelled' | 'success' | 'failure'; redirectTo?: string }> {
  if (!input.confirmImpl('This permanently deletes your account data. This cannot be undone.')) {
    return { status: 'cancelled' }
  }
  if (process.env.NEXT_PUBLIC_ACCOUNT_DELETE_CLIENT_DEBUG === 'true') {
    console.debug('[account-delete]', 'confirm_accepted')
    console.debug('[account-delete]', 'request_started')
  }

  try {
    const response = await input.fetchImpl('/api/account/delete', {
      method: 'DELETE',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      if (process.env.NEXT_PUBLIC_ACCOUNT_DELETE_CLIENT_DEBUG === 'true') {
        console.debug('[account-delete]', 'request_finished')
      }
      return { status: 'failure' }
    }

    let redirectTo = '/account-deleted'
    try {
      const body = (await response.json()) as { redirectTo?: unknown }
      if (typeof body?.redirectTo === 'string' && body.redirectTo.trim()) {
        redirectTo = body.redirectTo.trim()
      }
    } catch {
      redirectTo = '/account-deleted'
    }
    if (process.env.NEXT_PUBLIC_ACCOUNT_DELETE_CLIENT_DEBUG === 'true') {
      console.debug('[account-delete]', 'request_finished')
    }

    return { status: 'success', redirectTo }
  } catch {
    if (process.env.NEXT_PUBLIC_ACCOUNT_DELETE_CLIENT_DEBUG === 'true') {
      console.debug('[account-delete]', 'request_failed')
    }
    return { status: 'failure' }
  }
}

export function DeleteAccountButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)

  async function onDelete() {
    if (pending || deleted) return
    if (typeof window === 'undefined') {
      setError('Account deletion failed. Please try again or contact support.')
      return
    }
    setPending(true)
    setError(null)
    if (process.env.NEXT_PUBLIC_ACCOUNT_DELETE_CLIENT_DEBUG === 'true') {
      console.debug('[account-delete]', 'click_received')
    }
    try {
      const result = await deleteAccountFlow({
        confirmImpl: (message) => window.confirm(message),
        fetchImpl: (input, init) => window.fetch(input, init),
      })

      if (result.status === 'success') {
        if (process.env.NEXT_PUBLIC_ACCOUNT_DELETE_CLIENT_DEBUG === 'true') {
          console.debug('[account-delete]', 'redirect_started', result.redirectTo ?? '/account-deleted')
        }
        setError(null)
        setDeleted(true)
        const redirectTo = result.redirectTo?.trim() || '/account-deleted'
        if (typeof window.location?.assign === 'function') {
          window.location.assign(redirectTo)
          return
        }
        if (typeof window.location?.replace === 'function') {
          window.location.replace(redirectTo)
        }
        return
      }

      if (result.status === 'failure') {
        setError('Account deletion failed. Please try again or contact support.')
      }
    } catch {
      setError('Account deletion failed. Please try again or contact support.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending || deleted}
        onClick={onDelete}
        className="px-4 py-2 bg-red-700 rounded hover:bg-red-600 text-sm disabled:opacity-60"
      >
        {deleted ? 'Account deleted' : pending ? 'Deleting...' : 'Delete my account'}
      </button>
      {deleted ? <p className="mt-3 text-sm text-red-200">Account deleted. Redirecting...</p> : error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
    </div>
  )
}
