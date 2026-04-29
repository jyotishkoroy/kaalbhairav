/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: tarayai — https://tarayai.com
 */

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin()

  const [
    { count: userCount },
    { count: postCount },
    { count: reviewCount },
    { count: draftCount },
    { count: pendingComments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('news_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published'),
    supabase
      .from('news_posts')
      .select('*', { count: 'exact', head: true })
      .in('status', ['draft', 'pending', 'pending_review']),
    supabase
      .from('news_drafts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_review'),
    supabase
      .from('news_comments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  const stats = [
    { label: 'Total users', value: userCount ?? 0 },
    { label: 'Published posts', value: postCount ?? 0 },
    { label: 'Manual review posts', value: reviewCount ?? 0 },
    { label: 'RSS drafts', value: draftCount ?? 0 },
    { label: 'Pending comments', value: pendingComments ?? 0 },
  ]

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <div className="mb-10">
        <h1 className="font-serif text-5xl">Dashboard</h1>
        <p className="mt-3 text-white/60">
          Content health, review queues, and quick admin actions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="text-3xl font-semibold">{stat.value}</div>
            <div className="mt-2 text-sm text-white/50">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/drafts"
          className="rounded-lg border border-white/10 bg-white/[0.03] p-6 hover:border-orange-400/60"
        >
          <div className="text-xs uppercase tracking-widest text-orange-400">
            RSS queue
          </div>
          <h2 className="mt-3 font-serif text-2xl">Review fetched drafts</h2>
          <p className="mt-2 text-sm text-white/60">
            Approve or reject auto-ingested stories before they go public.
          </p>
        </Link>

        <Link
          href="/admin/news/new"
          className="rounded-lg border border-white/10 bg-white/[0.03] p-6 hover:border-orange-400/60"
        >
          <div className="text-xs uppercase tracking-widest text-orange-400">
            Manual
          </div>
          <h2 className="mt-3 font-serif text-2xl">Create a post</h2>
          <p className="mt-2 text-sm text-white/60">
            Add a sourced article or original commentary by hand.
          </p>
        </Link>

        <Link
          href="/admin/news/all"
          className="rounded-lg border border-white/10 bg-white/[0.03] p-6 hover:border-orange-400/60"
        >
          <div className="text-xs uppercase tracking-widest text-orange-400">
            Library
          </div>
          <h2 className="mt-3 font-serif text-2xl">Manage all posts</h2>
          <p className="mt-2 text-sm text-white/60">
            Edit, publish, unpublish, or remove existing news posts.
          </p>
        </Link>
      </div>
    </main>
  )
}
