/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function toggleLike(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=/news')
  const postId = String(formData.get('postId') || '')
  const { data: existing } = await supabase.from('news_post_likes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
  if (existing) await supabase.from('news_post_likes').delete().eq('id', existing.id)
  else await supabase.from('news_post_likes').insert({ post_id: postId, user_id: user.id })
  revalidatePath(`/news/${String(formData.get('slug') || '')}`)
}

export async function recordShare(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('news_post_shares').insert({ post_id: postId, user_id: user?.id ?? null, share_target: 'copy' })
}

export async function disableUserNewsPosting() {
  return { ok: false, message: 'User posting is disabled for now.' }
}

export async function createNewsPost() {
  return { ok: false, message: 'User posting is disabled for now.' }
}
