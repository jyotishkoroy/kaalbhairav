/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 300

export default async function NewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in?next=/news')

  const { data: posts } = await supabase
    .from('news_posts')
    .select('id, slug, title, excerpt, topic, source_name, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-4xl font-semibold">News</h1>
        <p className="mt-3 text-sm text-white/60">
          Logged-in readers only. Automated stories are linked to their source.
        </p>
      </header>

      <div className="space-y-4">
        {posts?.map((post) => (
          <Link key={post.id} href={`/news/${post.slug}`} className="block rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-xs uppercase tracking-widest text-orange-400">{post.topic || 'other'}</div>
            <h2 className="mt-2 text-2xl">{post.title}</h2>
            {post.excerpt && <p className="mt-2 text-sm text-white/70">{post.excerpt}</p>}
            <div className="mt-3 text-xs text-white/40">Source: {post.source_name}</div>
          </Link>
        ))}
        {!posts?.length && <div className="rounded-xl border border-white/10 p-8 text-white/50">No news posts yet.</div>}
      </div>
    </main>
  )
}
