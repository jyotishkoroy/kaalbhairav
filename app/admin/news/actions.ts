'use server'

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'

export async function approvePost(formData: FormData) {
  const { supabase } = await requireAdmin()
  const postId = formData.get('postId') as string

  if (!postId) {
    throw new Error('Missing post id')
  }

  const { data: post } = await supabase
    .from('news_posts')
    .select('slug')
    .eq('id', postId)
    .single()

  const { error } = await supabase
    .from('news_posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .eq('id', postId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/news')
  revalidatePath('/admin/news/all')
  revalidatePath('/news')
  if (post?.slug) {
    revalidatePath(`/news/${post.slug}`)
  }
}

export async function rejectPost(formData: FormData) {
  const { supabase } = await requireAdmin()
  const postId = formData.get('postId') as string

  if (!postId) {
    throw new Error('Missing post id')
  }

  const { error } = await supabase
    .from('news_posts')
    .update({
      status: 'rejected',
    })
    .eq('id', postId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/news')
  revalidatePath('/admin/news/all')
}
