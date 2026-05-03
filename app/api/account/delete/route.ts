/*
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { assertSameOriginRequest } from '@/lib/security/request-guards'
import { deleteAccountAndUserData } from '@/lib/account/delete-account'

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
    await deleteAccountAndUserData({
      userId: user.id,
      displayNameFallback: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? 'Deleted user',
      service,
      authUser: user,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[account-delete]', {
      stage: 'route_delete_account',
      code: error instanceof Error && 'code' in error ? (error as { code?: string }).code : undefined,
      message: error instanceof Error ? error.message : 'unknown_error',
    })
    return NextResponse.json({ error: 'account_deletion_failed' }, { status: 500 })
  }
}
