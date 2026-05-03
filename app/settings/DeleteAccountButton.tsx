/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export async function deleteAccountFlow(input: {
  confirmImpl: (message: string) => boolean
  fetchImpl: typeof fetch
}) : Promise<{ status: 'cancelled' | 'success' | 'failure' }> {
  if (!input.confirmImpl('This permanently deletes your account data. This cannot be undone.')) {
    return { status: 'cancelled' }
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
      return { status: 'failure' }
    }

    return { status: 'success' }
  } catch {
    return { status: 'failure' }
  }
}

export function DeleteAccountButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)

  async function onDelete() {
    if (pending || deleted) return
    setPending(true)
    setError(null)
    try {
      const result = await deleteAccountFlow({
        confirmImpl: confirm,
        fetchImpl: fetch,
      })

      if (result.status === 'success') {
        setError(null)
        setDeleted(true)
        if (typeof window !== 'undefined' && typeof window.location?.replace === 'function') {
          window.location.replace('/sign-in')
          return
        }
        router.replace('/sign-in')
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
