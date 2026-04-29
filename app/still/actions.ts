'use server'

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function saveEntry(entry: string, prompt: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const trimmedEntry = entry.trim()

  if (!trimmedEntry) {
    return { error: 'Empty entry' }
  }

  const { error } = await supabase.from('still_sessions').insert({
    user_id: user.id,
    session_type: 'journal',
    metadata: {
      prompt,
      entry: trimmedEntry,
    },
  })

  if (error) {
    return { error: error.message }
  }

  await supabase.rpc('bump_still_streak', { p_user_id: user.id })

  revalidatePath('/still')
  return { success: true }
}
