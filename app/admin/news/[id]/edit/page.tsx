import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { updatePost } from './actions'

type EditNewsPostPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditNewsPostPage({ params }: EditNewsPostPageProps) {
  const { id } = await params
  const { supabase } = await requireAdmin()

  const { data: post, error } = await supabase
    .from('news_posts')
    .select('id, title, slug, summary, body, category, source_name, source_url, status')
    .eq('id', id)
    .single()

  if (error || !post) {
    redirect('/admin/news/all')
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12 max-w-3xl mx-auto">
      <div className="mb-10">
        <Link href="/admin/news/all" className="text-sm text-white/50 hover:text-white">
          ← Back to All Posts
        </Link>

        <h1 className="text-5xl font-serif mt-6 mb-3">Edit News Post</h1>

        <p className="text-white/60">
          Update title, slug, summary, body, source, and status.
        </p>
      </div>

      <form action={updatePost} className="space-y-6">
        <input type="hidden" name="postId" value={post.id} />

        <div>
          <label className="block text-sm text-white/60 mb-2">
            Title
          </label>
          <input
            name="title"
            required
            defaultValue={post.title}
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
            defaultValue={post.slug}
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
            defaultValue={post.summary}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">
            Body
          </label>
          <textarea
            name="body"
            rows={12}
            defaultValue={post.body || ''}
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
            defaultValue={post.category}
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
            defaultValue={post.source_name || ''}
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
            defaultValue={post.source_url || 'https://tarayai.com'}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-400"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">
            Status
          </label>
          <select
            name="status"
            required
            defaultValue={post.status}
            className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-orange-400"
          >
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <button
          type="submit"
          className="bg-orange-400 text-black px-8 py-3 rounded-full font-medium hover:bg-orange-300"
        >
          Save Changes
        </button>
      </form>
    </main>
  )
}
