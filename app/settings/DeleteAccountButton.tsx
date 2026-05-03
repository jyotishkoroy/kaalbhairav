/*
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export async function deleteAccountFlow(input: {
  confirmImpl: (message: string) => boolean
  fetchImpl: typeof fetch
  onSuccess: () => void
  onFailure: () => void
}) {
  if (!input.confirmImpl('This permanently deletes your account data. This cannot be undone.')) return
  const response = await input.fetchImpl('/api/account/delete', { method: 'DELETE' })
  if (!response.ok) {
    input.onFailure()
    return
  }
  input.onSuccess()
}

export function DeleteAccountButton() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete() {
    setPending(true)
    setError(null)
    try {
      await deleteAccountFlow({
        confirmImpl: confirm,
        fetchImpl: fetch,
        onSuccess: () => {
          router.replace('/sign-in')
          router.refresh()
        },
        onFailure: () => {
          setError('Account deletion failed. Please try again or contact support.')
        },
      })
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
        disabled={pending}
        onClick={onDelete}
        className="px-4 py-2 bg-red-700 rounded hover:bg-red-600 text-sm disabled:opacity-60"
      >
        {pending ? 'Deleting...' : 'Delete my account'}
      </button>
      {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
    </div>
  )
}
