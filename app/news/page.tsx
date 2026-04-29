/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'

export const revalidate = 300

const categories = [
  { label: 'All', value: '' },
  { label: 'Kaal Bhairav', value: 'kaal_bhairav' },
  { label: 'Shiva', value: 'shiva' },
  { label: 'Festival', value: 'festival' },
  { label: 'Occult', value: 'occult' },
  { label: 'General', value: 'general' },
]

type NewsPageProps = {
  searchParams: Promise<{
    category?: string
  }>
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const { category } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('news_posts')
    .select('id, slug, title, summary, cover_image_url, source_name, category, published_at, like_count, comment_count')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(20)

  if (category) {
    query = query.eq('category', category)
  }

  const { data: posts } = await query

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12 max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="text-6xl font-serif mb-3">News</h1>
        <p className="text-white/60">
          Curated occult and Hindu spirituality, always linked to the original source.
        </p>
      </header>

      <nav className="mb-10 flex flex-wrap gap-3">
        {categories.map((item) => {
          const href = item.value ? `/news?category=${item.value}` : '/news'
          const active = (category || '') === item.value

          return (
            <Link
              key={item.value || 'all'}
              href={href}
              className={`rounded-full border px-4 py-2 text-sm ${
                active
                  ? 'border-orange-400 bg-orange-400 text-black'
                  : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {posts?.map((post) => (
          <Link
            key={post.id}
            href={`/news/${post.slug}`}
            className="group block overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] hover:border-orange-400/60"
          >
            {post.cover_image_url && (
              <Image
                src={post.cover_image_url}
                alt=""
                width={1200}
                height={675}
                className="w-full aspect-video object-cover transition duration-500 group-hover:scale-105"
              />
            )}
            <div className="p-6">
              <div className="text-xs text-orange-400 uppercase tracking-widest mb-3">
                {post.category?.replace(/_/g, ' ')}
              </div>
              <h2 className="text-2xl font-serif mb-3 group-hover:text-orange-300">
                {post.title}
              </h2>
              <p className="text-white/70 line-clamp-3">{post.summary}</p>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-white/40">
                <span>Source: {post.source_name || 'Unknown'}</span>
                <span>
                  {post.like_count ?? 0} likes · {post.comment_count ?? 0} comments
                </span>
              </div>
            </div>
          </Link>
        ))}
        {!posts?.length && (
          <p className="py-24 text-center text-white/50 md:col-span-2">
            No posts found. Check back soon.
          </p>
        )}
      </div>
    </main>
  )
}
