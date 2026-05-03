/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export const DELETION_FEEDBACK_SOURCE = 'account_deleted_exit_page'

export function hashDeletionFeedbackToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function normalizeDeletionFeedback(text: string) {
  return text.trim()
}

export function isValidDeletionFeedback(text: string) {
  return text.length >= 1 && text.length <= 2000
}

type ServiceClient = SupabaseClient

export async function saveAccountDeletionFeedback(params: {
  service: ServiceClient
  token: string
  feedback: string
}) {
  const tokenHash = hashDeletionFeedbackToken(params.token)
  const feedback = normalizeDeletionFeedback(params.feedback)
  if (!isValidDeletionFeedback(feedback)) {
    throw new Error('invalid_feedback')
  }

  const { data: tokenRows, error: tokenError } = await params.service
    .from('account_deletion_feedback_tokens')
    .select('id, deleted_user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .limit(1)

  if (tokenError || !tokenRows?.[0]) {
    throw new Error('invalid_token')
  }

  const tokenRow = tokenRows[0]
  if (tokenRow.used_at) {
    throw new Error('used_token')
  }

  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    throw new Error('expired_token')
  }

  const { data: deletedUsers, error: deletedUserError } = await params.service
    .from('deleted_users')
    .select('id, name')
    .eq('id', tokenRow.deleted_user_id)
    .limit(1)

  if (deletedUserError || !deletedUsers?.[0]) {
    throw new Error('invalid_token')
  }

  const deletedUser = deletedUsers[0]
  const { error: insertError } = await params.service.from('account_deletion_feedback').insert({
    deleted_user_id: deletedUser.id,
    name: deletedUser.name,
    feedback,
    source: DELETION_FEEDBACK_SOURCE,
  })
  if (insertError) {
    throw new Error('feedback_insert_failed')
  }

  const { error: tokenUpdateError } = await params.service
    .from('account_deletion_feedback_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenRow.id)

  if (tokenUpdateError) {
    throw new Error('feedback_token_update_failed')
  }

  return { ok: true as const }
}
