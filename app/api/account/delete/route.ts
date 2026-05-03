/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { assertSameOriginRequest } from '@/lib/security/request-guards'
import {
  AccountDeletionError,
  deleteAccountAndUserData,
  generateAccountDeletionFeedbackToken,
  hashAccountDeletionFeedbackToken,
} from '@/lib/account/delete-account'

export const runtime = 'nodejs'

export async function DELETE(req: NextRequest) {
  const originCheck = assertSameOriginRequest(req as unknown as Request)
  if (!originCheck.ok) {
    return NextResponse.json({ error: originCheck.error }, { status: originCheck.status })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const service = createServiceClient()

  try {
    const deletionResult = await deleteAccountAndUserData({
      userId: user.id,
      displayNameFallback: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? 'Deleted user',
      service,
      authUser: user,
    })

    let redirectTo = '/account-deleted'
    try {
      const token = generateAccountDeletionFeedbackToken()
      const tokenHash = hashAccountDeletionFeedbackToken(token)
      if (deletionResult.deletedUserId) {
        const { error } = await service.from('account_deletion_feedback_tokens').insert({
          deleted_user_id: deletionResult.deletedUserId,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        if (!error) {
          redirectTo = `/account-deleted?token=${token}`
        }
      }
    } catch {
      redirectTo = '/account-deleted'
    }

    return NextResponse.json({ ok: true, redirectTo })
  } catch (error) {
    const safeError = error instanceof AccountDeletionError
      ? {
          stage: error.stage,
          code: error.code,
          table: error.table,
          column: error.column,
        }
      : {
          stage: 'route_delete_account',
        }
    console.error('[account-delete]', safeError)
    if (process.env.ACCOUNT_DELETE_DEBUG === 'true') {
      return NextResponse.json({ error: 'account_deletion_failed', ...safeError }, { status: 500 })
    }
    return NextResponse.json({ error: 'account_deletion_failed' }, { status: 500 })
  }
}
