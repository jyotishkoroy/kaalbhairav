'use server'

/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'

function cleanSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function updatePost(formData: FormData) {
  const { supabase } = await requireAdmin()

  const postId = String(formData.get('postId') || '').trim()
  const title = String(formData.get('title') || '').trim()
  const rawSlug = String(formData.get('slug') || '').trim()
  const slug = cleanSlug(rawSlug)
  const summary = String(formData.get('summary') || '').trim()
  const body = String(formData.get('body') || '').trim()
  const category = String(formData.get('category') || 'general').trim()
  const sourceName = String(formData.get('source_name') || 'Manual Admin Post').trim()
  const sourceUrl = String(formData.get('source_url') || 'https://tarayai.com').trim()
  const status = String(formData.get('status') || 'draft').trim()

  if (!postId || !title || !slug || !summary) {
    throw new Error('Post id, title, slug, and summary are required.')
  }

  const { data: existingPost } = await supabase
    .from('news_posts')
    .select('slug, published_at')
    .eq('id', postId)
    .single()

  const publishedAt =
    status === 'published'
      ? existingPost?.published_at || new Date().toISOString()
      : null

  const { error } = await supabase
    .from('news_posts')
    .update({
      title,
      slug,
      summary,
      body: body || null,
      category,
      source_name: sourceName || 'Manual Admin Post',
      source_url: sourceUrl || 'https://tarayai.com',
      status,
      published_at: publishedAt,
    })
    .eq('id', postId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/news')
  revalidatePath('/admin/news/all')
  revalidatePath('/news')
  revalidatePath(`/news/${slug}`)
  if (existingPost?.slug && existingPost.slug !== slug) {
    revalidatePath(`/news/${existingPost.slug}`)
  }

  redirect('/admin/news/all')
}
