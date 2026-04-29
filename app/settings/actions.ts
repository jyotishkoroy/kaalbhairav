'use server'

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function deleteAccount() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', user.id)

  await supabase.auth.signOut()

  redirect('/')
}