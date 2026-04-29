/**
 * Copyright (c) 2026 Jyotishko Roy.
 * Proprietary and confidential. All rights reserved.
 * Project: TarayAI - https://tarayai.com
 */

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { createPost } from './actions'

export default async function NewNewsPostPage() {
  await requireAdmin()

  return (
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <div className="mb-10">
        <Link href="/admin/news" className="text-sm text-white/50 hover:text-white">
          ← Back to Admin News
        </Link>

        <h1 className="text-5xl font-serif mt-6 mb-3">New News Post</h1>

        <p className="text-white/60">
          Create a draft post. You can approve it from the admin review page.
        </p>
      </div>

      <form action={createPost} className="space-y-6">
        <div>
          <label className="block text-sm text-white/60 mb-2">
            Title
          </label>
          <input
            name="title"
            required
            placeholder="Example: The Meaning of Kaal Bhairav"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">
            Slug
          </label>
          <input
            name="slug"
            required
            placeholder="example: meaning-of-kaal-bhairav"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-400"
          />
          <p className="text-xs text-white/40 mt-2">
            Use lowercase letters, numbers, and hyphens only. No spaces.
          </p>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">
            Summary
          </label>
          <textarea
            name="summary"
            required
            rows={3}
            placeholder="Short summary shown on the news list page."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">
            Body
          </label>
          <textarea
            name="body"
            rows={10}
            placeholder="Full article text."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">
            Category
          </label>
          <select
            name="category"
            required
            defaultValue="kaal_bhairav"
            className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-400"
          >
            <option value="kaal_bhairav">Kaal Bhairav</option>
            <option value="astrology">Astrology</option>
            <option value="temple">Temple</option>
            <option value="festival">Festival</option>
            <option value="spirituality">Spirituality</option>
            <option value="general">General</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">
            Source Name
          </label>
          <input
            name="source_name"
            placeholder="Example: Manual Admin Post"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">
            Source URL
          </label>
          <input
            name="source_url"
            type="url"
            placeholder="https://example.com/article"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-400"
          />
        </div>

        <button
          type="submit"
          className="bg-orange-400 text-black px-8 py-3 rounded-full font-medium hover:bg-orange-300"
        >
          Save Draft
        </button>
      </form>
    </main>
  )
}
