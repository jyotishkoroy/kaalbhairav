/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { describe, expect, it, vi } from 'vitest'
import { hashDeletionFeedbackToken, saveAccountDeletionFeedback } from '@/lib/account/deletion-feedback'

function buildService() {
  const tokens = [{ id: 'token-1', deleted_user_id: 'du-1', token_hash: hashDeletionFeedbackToken('raw-token'), expires_at: '2999-01-01T00:00:00.000Z', used_at: null }]
  const deletedUsers = [{ id: 'du-1', name: 'Deleted Name' }]
  const feedbackRows: unknown[] = []
  const usedAt: Record<string, string> = {}
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(async () => {
            if (table === 'account_deletion_feedback_tokens') return { data: tokens, error: null }
            if (table === 'deleted_users') return { data: deletedUsers, error: null }
            return { data: [], error: null }
          }),
        })),
      })),
      insert: vi.fn(async (payload: unknown) => {
        feedbackRows.push(payload)
        return { error: null }
      }),
      update: vi.fn(() => ({
        eq: vi.fn(async (column: string, value: string) => {
          if (table === 'account_deletion_feedback_tokens' && column === 'id') usedAt[value] = new Date().toISOString()
          return { error: null }
        }),
      })),
    })),
    _feedbackRows: feedbackRows,
    _usedAt: usedAt,
  }
}

describe('saveAccountDeletionFeedback', () => {
  it('saves feedback and marks token used', async () => {
    const service = buildService()
    await expect(saveAccountDeletionFeedback({
      service: service as never,
      token: 'raw-token',
      feedback: '  helpful experience  ',
    })).resolves.toEqual({ ok: true })

    expect(service._feedbackRows[0]).toEqual({
      deleted_user_id: 'du-1',
      name: 'Deleted Name',
      feedback: 'helpful experience',
      source: 'account_deleted_exit_page',
    })
  })
})
