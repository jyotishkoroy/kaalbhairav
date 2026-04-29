/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link href="/admin" className="font-serif text-2xl">
            Admin
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-white/60">
            <Link href="/admin" className="hover:text-white">
              Dashboard
            </Link>
            <Link href="/admin/news" className="hover:text-white">
              Review
            </Link>
            <Link href="/admin/drafts" className="hover:text-white">
              RSS Drafts
            </Link>
            <Link href="/admin/news/all" className="hover:text-white">
              All Posts
            </Link>
            <Link href="/admin/news/new" className="hover:text-white">
              New Post
            </Link>
            <Link href="/admin/controls" className="hover:text-white">
              Controls
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
