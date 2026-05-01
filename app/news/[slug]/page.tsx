/**
 * Copyright (c) 2026 Jyotishko Roy. All rights reserved. No permission is granted to copy, modify, distribute, sublicense, host, sell,
 * commercially use, train models on, scrape, or create derivative works from this
 * repository or any part of it without prior written permission from Jyotishko Roy.
 */

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { NewsInteractions } from './news-interactions'

export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

export default async function NewsPostPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=/news')

  const { data: post } = await supabase
    .from('news_posts')
    .select('id, slug, title, body, topic, source_name, original_url, source_type')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!post) notFound()

  const { data: liked } = await supabase
    .from('news_post_likes')
    .select('id')
    .eq('post_id', post.id)
    .eq('user_id', user.id)
    .maybeSingle()

  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://tarayai.com'}/news/${post.slug}`

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12">
      <Link href="/news" className="text-sm text-white/50 hover:text-white">← Back to News</Link>
      <div className="mt-6 text-xs uppercase tracking-widest text-orange-400">{post.topic}</div>
      <h1 className="mt-2 text-4xl font-semibold">{post.title}</h1>
      <div className="mt-6 whitespace-pre-wrap text-white/80 leading-7">{post.body}</div>
      <div className="mt-3 text-xs text-white/40">
        Source:{' '}
        <a href={post.original_url} target="_blank" rel="noopener noreferrer" className="underline">
          {post.source_name || 'Original source'}
        </a>
      </div>
      <NewsInteractions postId={post.id} slug={post.slug} shareUrl={shareUrl} initiallyLiked={Boolean(liked)} />
    </main>
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: post } = await supabase.from('news_posts').select('title, excerpt').eq('slug', slug).eq('status', 'published').maybeSingle()
  if (!post) return {}
  return { title: post.title, description: post.excerpt ?? undefined }
}
